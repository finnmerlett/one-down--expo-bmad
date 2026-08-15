#!/usr/bin/env python3
"""One-time: obtain the Google master token gkeepapi needs (Story 9.6).

Google Keep has no official consumer API — gkeepapi drives the internal
Android sync API, which authenticates with a long-lived "master token"
(`aas_et/...`). Two ways to get one; try A first:

  A) OAuth-token exchange (works with any account):
     1. Open https://accounts.google.com/EmbeddedSetup in a PRIVATE browser
        window and sign in to the Google account that owns the Keep list.
     2. On the final page (may look stuck on a spinner — that's fine), open
        DevTools -> Application -> Cookies -> accounts.google.com and copy the
        value of the `oauth_token` cookie (starts with `oauth2_4/`).
     3. Within a few minutes, run:
        scripts/keep/.venv/bin/python scripts/keep/get-master-token.py \
          --email you@gmail.com --oauth-token 'oauth2_4/...'

  B) App password (needs 2FA enabled; Google is phasing this out):
     Create one at https://myaccount.google.com/apppasswords, then:
        scripts/keep/.venv/bin/python scripts/keep/get-master-token.py \
          --email you@gmail.com --app-password 'xxxx xxxx xxxx xxxx'

On success the token is printed once. Put it in the REPO-ROOT .env as
GOOGLE_KEEP_MASTER_TOKEN=... (gitignored). It does not expire until the
account's password changes or access is revoked. NEVER commit it.
"""

import argparse
import sys

import gpsoauth

# Any plausible 16-hex-char device id works; Google just records it.
ANDROID_ID = "0123456789abcdef"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--email", required=True)
    parser.add_argument("--oauth-token", help="oauth_token cookie from EmbeddedSetup (route A)")
    parser.add_argument("--app-password", help="16-char app password (route B)")
    args = parser.parse_args()

    if args.oauth_token:
        response = gpsoauth.exchange_token(args.email, args.oauth_token, ANDROID_ID)
    elif args.app_password:
        response = gpsoauth.perform_master_login(
            args.email, args.app_password.replace(" ", ""), ANDROID_ID
        )
    else:
        sys.exit("Provide --oauth-token (route A) or --app-password (route B).")

    token = response.get("Token")
    if not token:
        sys.exit(f"No token in response — Google said: {response}")
    print(token)


if __name__ == "__main__":
    main()
