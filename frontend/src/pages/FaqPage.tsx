import { useEffect } from 'react';
import './FaqPage.css';

const FAQ_ITEMS = [
  {
    question: 'How does my donation help girls in Havyn safe homes?',
    answer:
      'Donations support day-to-day care like food, housing, education materials, counseling access, and reintegration planning for girls in our care.',
  },
  {
    question: 'Is my donation secure and can I get a receipt?',
    answer:
      'Yes. Havyn uses secure payment flows and donor accounts help us provide tax receipts and a record of your giving history.',
  },
  {
    question: 'Can I choose where my donation goes?',
    answer:
      'Havyn allocates gifts where need is greatest across safe homes and core services, while still reporting impact through donor-facing updates.',
  },
  {
    question: 'How can I contact the support team?',
    answer:
      'You can reach support anytime at havyn.support@havyn.org for help with donations, account access, or general questions.',
  },
  {
    question: 'How do I create an account as a donor?',
    answer:
      'Go to the login page and select create account. A donor account lets you complete giving, manage profile details, and view donation history.',
  },
] as const;

function FaqPage() {
  useEffect(() => {
    document.title = 'FAQ | Havyn';
  }, []);

  return (
    <div className="faq-page">
      <section className="faq-section">
        <div className="faq-container">
          <span className="faq-label">Resources</span>
          <h1>Frequently Asked Questions</h1>
          <p className="faq-intro">
            Quick answers to common donor and support questions.
          </p>

          <div className="faq-list" role="list">
            {FAQ_ITEMS.map((item) => (
              <article key={item.question} className="faq-card" role="listitem">
                <h2>{item.question}</h2>
                <p>{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default FaqPage;
