import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './PrivacyPolicyPage.css';

function PrivacyPolicyPage() {
  useEffect(() => {
    document.title = 'Privacy Policy | Havyn';
  }, []);

  return (
    <div className="privacy-page">
      <article className="privacy-article">
        <h1>Privacy Policy</h1>
        <p className="privacy-meta">Last updated: April 8, 2026</p>

        <h2 id="intro">Introduction</h2>
        <p>
          Havyn (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;)
          respects your privacy. This policy describes how we collect, use, and
          protect personal information when you use our website and related
          services. It is provided for transparency and demonstration purposes;
          consult legal counsel for jurisdiction-specific requirements.
        </p>

        <h2 id="collect">Information we collect</h2>
        <p>We may collect information that you provide directly, such as:</p>
        <ul>
          <li>Name and contact details when you reach out or sign up</li>
          <li>
            Donation or payment-related information processed by our payment
            partners
          </li>
          <li>Account credentials if you create an account</li>
          <li>Messages you send to us through forms or email</li>
        </ul>
        <p>
          We also collect certain technical information automatically, such as
          browser type, device type, general location derived from IP address,
          and pages visited, to operate and improve the site.
        </p>

        <h2 id="use">How we use information</h2>
        <p>We use personal information to:</p>
        <ul>
          <li>Provide our programs, website, and donor services</li>
          <li>Process donations and send receipts or acknowledgments</li>
          <li>Respond to inquiries and communicate about Havyn&apos;s work</li>
          <li>
            Analyze usage in aggregate to improve accessibility and performance
          </li>
          <li>
            Comply with legal obligations and protect our users and organization
          </li>
        </ul>

        <h2 id="cookies">Cookies and similar technologies</h2>
        <p>
          We may use cookies and similar technologies to remember preferences,
          measure traffic, and support essential site functions. When you first
          visit, you may see a banner that lets you accept or decline
          non-essential cookies, consistent with your choices stored in your
          browser. You can control cookies through your browser settings.
        </p>

        <h2 id="retention">Data retention</h2>
        <p>
          We retain personal information only as long as needed for the purposes
          described above, unless a longer period is required by law. Donation
          records may be kept for accounting and tax purposes as applicable.
        </p>

        <h2 id="rights">Your rights</h2>
        <p>
          Depending on where you live, you may have rights to access, correct,
          delete, or restrict certain processing of your personal data, or to
          object to processing or request portability. To exercise these rights,
          contact us through the channels listed on our website. We will respond
          in line with applicable law.
        </p>

        <h2 id="contact">Contact</h2>
        <p>
          For privacy-related questions, please contact us through the
          information provided on our <Link to="/">home page</Link> or your
          usual Havyn contact. We will direct your request to the appropriate
          team.
        </p>

        <h2 id="changes">Changes to this policy</h2>
        <p>
          We may update this policy from time to time. The &ldquo;Last
          updated&rdquo; date at the top will change when we do. Continued use
          of the site after changes constitutes acceptance of the updated
          policy, to the extent permitted by law.
        </p>

        <p className="privacy-disclaimer">
          This policy is a general description for demonstration purposes and
          does not constitute legal advice.
        </p>
      </article>
    </div>
  );
}

export default PrivacyPolicyPage;
