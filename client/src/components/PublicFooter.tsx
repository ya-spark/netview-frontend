export function PublicFooter() {
  const contactEmail = import.meta.env.VITE_CONTACT_EMAIL;
  const linkedInLink = import.meta.env.VITE_LINKEDIN_LINK;

  if (!contactEmail) {
    throw new Error('VITE_CONTACT_EMAIL environment variable is required');
  }

  if (!linkedInLink) {
    throw new Error('VITE_LINKEDIN_LINK environment variable is required');
  }

  // Ensure LinkedIn link has https:// protocol
  const linkedInUrl = linkedInLink.startsWith('http') ? linkedInLink : `https://${linkedInLink}`;

  return (
    <footer className="bg-card border-t border-border py-12">
      <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">
                N
              </span>
            </div>
            <span className="text-xl font-bold text-foreground">
              NetView
            </span>
          </div>

          <div className="flex items-center space-x-6 text-sm text-muted-foreground">
            <a
              href={`mailto:${contactEmail}`}
              className="hover:text-foreground transition-colors"
              data-testid="link-contact-email"
            >
              {contactEmail}
            </a>
            <a
              href={linkedInUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
              data-testid="link-linkedin"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

