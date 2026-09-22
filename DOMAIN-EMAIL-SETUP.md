# Hendry Commercial — Domain & Email Setup

## Recommended live setup

### Primary domain
hendrycommercial.co.uk

### Defensive domain
hendrycommercial.com — register if available and reasonably priced; redirect to the .co.uk site.

### Registrar
Namecheap, to keep domain management alongside CV Chaos.

### Website hosting
GitHub Pages — existing repository:
J0N1X303/hendry-commercial

### Primary email
jonathan@hendrycommercial.co.uk

### Aliases
- hello@hendrycommercial.co.uk
- jonny@hendrycommercial.co.uk
- contact@hendrycommercial.co.uk

All aliases should route to Jonathan's primary mailbox.

### Email platform
Microsoft Exchange Online Plan 1.

Reason: lowest-cost Microsoft option that provides business-class custom-domain email and keeps the workflow in Outlook. Upgrade to Microsoft 365 Business Basic only if OneDrive, Bookings or the wider business apps become useful.

## Domain DNS — website

Once the domain is owned and ready to connect to GitHub Pages:

A records for apex (@):
- 185.199.108.153
- 185.199.109.153
- 185.199.110.153
- 185.199.111.153

CNAME:
- www -> j0n1x303.github.io

Then add a GitHub Pages custom domain of:
hendrycommercial.co.uk

Do not add the repository CNAME file until the domain has been purchased and DNS is being configured.

## Domain DNS — email

Microsoft 365 / Exchange will provide the exact tenant-specific DNS records during custom-domain setup.

Expected record classes:
- TXT verification record
- MX record
- SPF TXT record
- DKIM CNAME records (enable DKIM after DNS validates)
- DMARC TXT record

Recommended initial DMARC policy after SPF and DKIM are passing:
v=DMARC1; p=none;

Move to quarantine/reject later after confirming legitimate mail is authenticating correctly.

## Website changes after email/domain go live
- Replace temporary Outlook mailto with jonathan@hendrycommercial.co.uk
- Remove temporary-email note
- Add canonical URL
- Add Open Graph / social metadata
- Add favicon and organisation/person structured data
- Add sitemap.xml and robots.txt
- Redirect www to apex (or vice versa consistently)
- Enforce HTTPS

## Suggested email display name
Jonathan Hendry | Hendry Commercial

## Suggested signature
Jonathan Hendry
Founder | Hendry Commercial
Commercial Leadership · Growth · Ventures
hendrycommercial.co.uk
LinkedIn
