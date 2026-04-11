import Header from "../components/Header";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-stone">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pb-12 pt-8">
        <h2 className="text-2xl font-bold text-black mb-6">Privacy Policy</h2>
        <p className="text-xs text-gray-400 mb-8">Last updated: April 11, 2026</p>

        <div className="bg-white rounded-xl border border-gray-100 p-8 space-y-6 text-sm text-gray-700 leading-relaxed">
          <section>
            <h3 className="text-base font-bold text-black mb-2">1. Overview</h3>
            <p>
              Redline Dashboard (&quot;the Application&quot;) is an internal business tool operated by
              Redline CrossFit Equipment for the sole purpose of advertising performance analysis
              and creative management. This Application is not intended for public use and is
              restricted to authorized team members.
            </p>
          </section>

          <section>
            <h3 className="text-base font-bold text-black mb-2">2. Data Collection</h3>
            <p>
              The Application does not collect, store, or process personal data from end users.
              The Application accesses advertising and page performance data through authorized
              Meta Platform APIs solely for internal business analytics purposes. No personal
              information of ad viewers or social media users is collected or stored.
            </p>
          </section>

          <section>
            <h3 className="text-base font-bold text-black mb-2">3. Data Usage</h3>
            <p>
              All data accessed through the Application is used exclusively for internal
              advertising performance analysis, creative strategy development, and campaign
              optimization. Data is displayed in aggregate form within the dashboard and is
              not used for any purpose beyond internal business operations.
            </p>
          </section>

          <section>
            <h3 className="text-base font-bold text-black mb-2">4. Data Sharing</h3>
            <p>
              We do not sell, trade, rent, or otherwise share any data accessed through this
              Application with third parties. Data remains strictly within the organization
              and is accessible only to authorized team members.
            </p>
          </section>

          <section>
            <h3 className="text-base font-bold text-black mb-2">5. Data Storage</h3>
            <p>
              The Application does not maintain a persistent database of advertising data.
              Performance data is fetched in real-time from Meta Platform APIs and displayed
              within the dashboard. User preferences (such as dashboard settings) are stored
              locally in the user&apos;s browser and are not transmitted to any server.
            </p>
          </section>

          <section>
            <h3 className="text-base font-bold text-black mb-2">6. Third-Party Services</h3>
            <p>
              The Application integrates with Meta Platform APIs (including the Marketing API
              and Ad Library API) under authorized access. Use of these APIs is governed by
              Meta&apos;s Platform Terms and Developer Policies. The Application is hosted on
              Vercel&apos;s infrastructure.
            </p>
          </section>

          <section>
            <h3 className="text-base font-bold text-black mb-2">7. Security</h3>
            <p>
              Access to the Application is restricted to authorized personnel. API credentials
              are stored securely as environment variables and are never exposed to the client.
              All communication occurs over HTTPS.
            </p>
          </section>

          <section>
            <h3 className="text-base font-bold text-black mb-2">8. Contact</h3>
            <p>
              For questions regarding this privacy policy or data practices, contact the
              Redline CrossFit Equipment team at the organization&apos;s primary business
              email address.
            </p>
          </section>

          <section>
            <h3 className="text-base font-bold text-black mb-2">9. Changes to This Policy</h3>
            <p>
              This privacy policy may be updated from time to time. Any changes will be
              reflected on this page with an updated revision date.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
