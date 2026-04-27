import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './FAQ.css';

export default function FAQ() {
  const navigate = useNavigate();
  const [openIndex, setOpenIndex] = useState(null);

  const faqData = [
    {
      category: "General",
      questions: [
        {
          question: "How do I sign up?",
          answer: "Click the Login button, select your role (Customer or Tasker), and sign in with your Google account. It's quick and secure!"
        },
        {
          question: "Is the platform free to use?",
          answer: "Yes! Creating an account and browsing services is completely free. Customers only pay for the services they book, and taskers pay a small commission on completed jobs."
        }
      ]
    },
    {
      category: "For Customers",
      questions: [
        {
          question: "How do I book a service?",
          answer: "Browse available services, select the one you need, choose a tasker, and click 'Book Now'. Select your preferred date and time, and the tasker will confirm your booking."
        },
        {
          question: "Can I chat with taskers before booking?",
          answer: "Yes! Once you book a service, you can chat with your assigned tasker directly through our platform to discuss details."
        },
        {
          question: "What is AMC?",
          answer: "AMC (Annual Maintenance Contract) allows you to schedule regular maintenance services at discounted rates, perfect for recurring needs."
        },
        {
          question: "What commission does a customer pay?",
          answer: "For technical job categories (e.g., Electrician, Plumber, AC Servicing, Appliance Repair, etc.), the customer pays a 7.5% facilitation commission. For non-technical job categories (e.g., Car Washing, Cleaning, Tutoring, Delivery, etc.), the customer pays a 5% facilitation commission."
        },
        {
          question: "How do payments work?",
          answer: "We accept all major payment methods. Payments are secure, encrypted, and processed through our platform for your safety."
        }
      ]
    },
    {
      category: "For Taskers",
      questions: [
        {
          question: "What is the difference between Helper and Professional?",
          answer: "Helpers are entry-level service providers, while Professionals have verified credentials, experience, and higher ratings. Professionals can charge premium rates."
        },
        {
          question: "How do I become a verified professional?",
          answer: "Complete your profile, upload verification documents (ID, certifications), and maintain high ratings. Our admin team will review and verify your credentials."
        },
        {
          question: "Can I set my own prices?",
          answer: "Yes! You can set your service prices within the recommended price ranges for your service category and experience level."
        },
        {
          question: "How do I receive bookings?",
          answer: "When a customer books your service, you'll receive a notification. You can accept or decline based on your availability."
        },
        {
          question: "Are there restrictions on which jobs helpers and unverified professionals can post?",
          answer: "Yes. Helpers and professionals with pending verification can only post jobs in the following categories: Car Washing, Assignment Writing, Project Making, and Other. To post jobs in other categories, you must apply for and receive a professional badge. Unverified professionals will see a message if they try to post jobs outside their allowed categories, and helpers are prompted to apply for professional status."
        },
        
        {
          question: "What commission does a tasker pay?",
          answer: "For technical job categories (e.g., Electrician, Plumber, AC Servicing, Appliance Repair, etc.), the tasker pays a 7.5% facilitation commission. For non-technical job categories (e.g., Car Washing, Cleaning, Tutoring, Delivery, etc.), the tasker pays a 5% facilitation commission."
        }
      ]
    }
  ];

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <>            
      <div className="faq-page">
        <button className="back-button" onClick={() => navigate(-1)}>
          ← Back
        </button>

        <div className="faq-container">
          <p className="faq-subtitle">Find answers to common questions about TrustedHands</p>

        {faqData.map((section, sectionIndex) => (
          <div key={sectionIndex} className="faq-category">
            <h2>{section.category}</h2>
            <div className="faq-list">
              {section.questions.map((faq, index) => {
                const globalIndex = `${sectionIndex}-${index}`;
                return (
                  <div 
                    key={globalIndex} 
                    className={`faq-item ${openIndex === globalIndex ? 'active' : ''}`}
                  >
                    <div 
                      className="faq-question"
                      onClick={() => toggleFAQ(globalIndex)}
                    >
                      <h3>{faq.question}</h3>
                      <span className="faq-toggle">{openIndex === globalIndex ? '−' : '+'}</span>
                    </div>
                    {openIndex === globalIndex && (
                      <div className="faq-answer">
                        <p>{faq.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="faq-footer">
          <p>Still have questions?</p>
          <button 
            className="contact-button"
            onClick={() => navigate('/contact')}
          >
            Contact Us
          </button>
        </div>
      </div>
    </div>    </>
  );
}
