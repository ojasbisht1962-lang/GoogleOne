"""
Data Migration Script - Fix Database Inconsistencies
Run this to fix existing data issues:
1. Create missing payment records for bookings
2. Create missing wallets for users
3. Sync payment statuses

⚠️  IMPORTANT: Run backup_database.py FIRST before this script!
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

async def migrate_data():
    mongodb_url = os.getenv('MONGODB_URL')
    database_name = os.getenv('DATABASE_NAME')
    
    client = AsyncIOMotorClient(mongodb_url)
    db = client[database_name]
    
    print('=' * 100)
    print('DATA MIGRATION & CLEANUP SCRIPT')
    print('=' * 100)
    
    # ===== STEP 1: Create missing payment records =====
    print('\n📝 STEP 1: Creating missing payment records...')
    
    bookings = await db.bookings.find({}).to_list(length=1000)
    payments = await db.payments.find({}, {'booking_id': 1}).to_list(length=1000)
    payment_booking_ids = {p['booking_id'] for p in payments}
    
    missing_payments = 0
    for booking in bookings:
        booking_id = str(booking['_id'])
        
        if booking_id not in payment_booking_ids:
            # Determine payment status based on booking status
            booking_status = booking.get('status', 'pending')
            
            if booking_status == 'completed':
                payment_status = 'completed'
            elif booking_status in ['accepted', 'in_progress']:
                payment_status = 'locked'
            elif booking_status == 'cancelled':
                payment_status = 'refunded'
            else:
                payment_status = 'pending'
            
            payment_doc = {
                'booking_id': booking_id,
                'customer_id': booking.get('customer_id'),
                'provider_id': booking.get('tasker_id'),
                'amount': booking.get('total_amount', 0.0),
                'payment_method': 'upi_qr',
                'status': payment_status,
                'is_verified': booking_status == 'completed',
                'created_at': booking.get('created_at', datetime.utcnow()),
                'updated_at': datetime.utcnow()
            }
            
            if payment_status == 'completed':
                payment_doc['completed_at'] = booking.get('completed_at', datetime.utcnow())
                payment_doc['paid_at'] = booking.get('completed_at', datetime.utcnow())
                payment_doc['locked_at'] = booking.get('created_at', datetime.utcnow())
            elif payment_status == 'locked':
                payment_doc['locked_at'] = datetime.utcnow()
                payment_doc['paid_at'] = datetime.utcnow()
            
            await db.payments.insert_one(payment_doc)
            missing_payments += 1
            print(f'  ✅ Created payment for booking {booking_id} (status: {payment_status})')
    
    print(f'\n✅ Created {missing_payments} missing payment records')
    
    # ===== STEP 2: Create missing wallets =====
    print('\n💰 STEP 2: Creating missing wallets...')
    
    users = await db.users.find({}, {'_id': 1, 'email': 1}).to_list(length=1000)
    wallets = await db.wallets.find({}, {'user_id': 1}).to_list(length=1000)
    wallet_user_ids = {w['user_id'] for w in wallets}
    
    missing_wallets = 0
    for user in users:
        user_id = str(user['_id'])
        
        if user_id not in wallet_user_ids:
            wallet_doc = {
                'user_id': user_id,
                'balance': 0.0,
                'locked_balance': 0.0,
                'total_earned': 0.0,
                'total_spent': 0.0,
                'transactions': [],
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            }
            
            await db.wallets.insert_one(wallet_doc)
            missing_wallets += 1
            print(f'  ✅ Created wallet for user {user.get("email")}')
    
    print(f'\n✅ Created {missing_wallets} missing wallets')
    
    # ===== STEP 3: Update payment statuses based on booking status =====
    print('\n🔄 STEP 3: Syncing payment statuses with booking statuses...')
    
    synced = 0
    all_bookings = await db.bookings.find({}).to_list(length=1000)
    
    for booking in all_bookings:
        booking_id = str(booking['_id'])
        booking_status = booking.get('status')
        
        # Find corresponding payment
        payment = await db.payments.find_one({'booking_id': booking_id})
        
        if payment:
            current_payment_status = payment.get('status')
            desired_status = None
            
            if booking_status == 'completed' and current_payment_status != 'completed':
                desired_status = 'completed'
                update_data = {
                    'status': 'completed',
                    'completed_at': booking.get('completed_at', datetime.utcnow()),
                    'updated_at': datetime.utcnow()
                }
            elif booking_status in ['accepted', 'in_progress'] and current_payment_status == 'pending':
                desired_status = 'locked'
                update_data = {
                    'status': 'locked',
                    'locked_at': datetime.utcnow(),
                    'updated_at': datetime.utcnow()
                }
            elif booking_status == 'cancelled' and current_payment_status in ['pending', 'locked']:
                desired_status = 'refunded'
                update_data = {
                    'status': 'refunded',
                    'refunded_at': datetime.utcnow(),
                    'updated_at': datetime.utcnow()
                }
            
            if desired_status:
                await db.payments.update_one(
                    {'_id': payment['_id']},
                    {'$set': update_data}
                )
                synced += 1
                print(f'  ✅ Synced payment for booking {booking_id}: {current_payment_status} → {desired_status}')
    
    print(f'\n✅ Synced {synced} payment records')
    
    # ===== STEP 4: Report statistics =====
    print('\n' + '=' * 100)
    print('MIGRATION COMPLETE - STATISTICS')
    print('=' * 100)
    
    total_bookings = await db.bookings.count_documents({})
    total_payments = await db.payments.count_documents({})
    total_users = await db.users.count_documents({})
    total_wallets = await db.wallets.count_documents({})
    
    completed_payments = await db.payments.count_documents({'status': 'completed'})
    locked_payments = await db.payments.count_documents({'status': 'locked'})
    pending_payments = await db.payments.count_documents({'status': 'pending'})
    
    # Calculate total revenue
    pipeline = [
        {'$match': {'status': 'completed'}},
        {'$group': {'_id': None, 'total': {'$sum': '$amount'}}}
    ]
    revenue_result = await db.payments.aggregate(pipeline).to_list(length=1)
    total_revenue = revenue_result[0]['total'] if revenue_result else 0
    
    print(f'\n📊 Database Status:')
    print(f'  Total Bookings: {total_bookings}')
    print(f'  Total Payments: {total_payments}')
    print(f'  Total Users: {total_users}')
    print(f'  Total Wallets: {total_wallets}')
    
    print(f'\n💰 Payment Status Breakdown:')
    print(f'  Completed: {completed_payments} (₹{total_revenue})')
    print(f'  Locked: {locked_payments}')
    print(f'  Pending: {pending_payments}')
    
    print(f'\n✅ All bookings now have payment records: {total_bookings == total_payments}')
    print(f'✅ All users now have wallets: {total_users == total_wallets}')
    print(f'\n💵 Total Revenue: ₹{total_revenue}')
    print(f'📈 Dashboard should now show correct data!')
    
    print('\n' + '=' * 100)
    
    client.close()

if __name__ == "__main__":
    print('\n' + '=' * 100)
    print('⚠️  DATABASE MIGRATION SCRIPT')
    print('=' * 100)
    print('\n⚠️  WARNING: This script will modify your database!')
    print('\n📋 Pre-requisites:')
    print('  1. Make sure backup_database.py has been run')
    print('  2. Verify backup was created successfully')
    print('  3. Backend server should be stopped')
    
    response = input('\n✅ Have you created a backup? (yes/no): ')
    
    if response.lower() != 'yes':
        print('\n❌ Migration cancelled.')
        print('\n📝 To create a backup first, run:')
        print('   python backup_database.py')
        exit(0)
    
    response2 = input('\n⚠️  Proceed with migration? (yes/no): ')
    
    if response2.lower() == 'yes':
        asyncio.run(migrate_data())
    else:
        print('❌ Migration cancelled.')
