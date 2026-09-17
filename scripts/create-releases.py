#!/usr/bin/env python3
"""Create GitHub releases for all dist zip files."""
import base64, subprocess, json, urllib.request, urllib.error, os, sys

def get_token():
    raw = subprocess.check_output(['security', 'find-generic-password', '-s', 'gh:github.com', '-w']).strip()
    prefix = b'go-keyring-base64:'
    if raw.startswith(prefix):
        return base64.b64decode(raw[len(prefix):]).decode().strip()
    return raw.decode().strip()

TOK = get_token()
REPO = 'bugbountycoi/Reporting-Workbench'
DIST = os.path.join(os.path.dirname(__file__), '..', 'dist')
API = 'https://api.github.com'
UPLOAD_API = 'https://uploads.github.com'

def gh_request(method, url, body=None, headers=None, binary=False):
    h = {
        'Authorization': f'token {TOK}',
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'release-script',
    }
    if headers:
        h.update(headers)
    data = None
    if body is not None:
        if binary:
            data = body
        else:
            data = json.dumps(body).encode()
            h['Content-Type'] = 'application/json'
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req) as r:
            chunks = []
            while True:
                chunk = r.read(65536)
                if not chunk:
                    break
                chunks.append(chunk)
            return json.loads(b''.join(chunks))
    except urllib.error.HTTPError as e:
        body_bytes = e.read()
        print(f'HTTP {e.code}: {body_bytes.decode()[:300]}', file=sys.stderr)
        raise

RELEASES = [
    {
        'tag': 'v0.1.0',
        'file': 'reporting-workbench-0.1.0-20260901.zip',
        'name': 'Reporting Workbench v0.1.0',
        'body': (
            'Initial release of Reporting Workbench Community Edition.\n\n'
            'Self-hosted reporting tool for bug bounty program management. '
            'Includes programs, submissions, and payouts data views.'
        ),
        'prerelease': True,
    },
    {
        'tag': 'v0.2.0',
        'file': 'reporting-workbench-0.2.0-20260901.zip',
        'name': 'Reporting Workbench v0.2.0',
        'body': (
            'v0.2.0 — Major feature release.\n\n'
            'Introduces the user module system (UserModuleSpec), theme engine, '
            'and report builder wizard. Allows users to create and import custom report modules.'
        ),
        'prerelease': False,
    },
    {
        'tag': 'v0.2.005',
        'file': 'reporting-workbench-0.2.005.zip',
        'name': 'Reporting Workbench v0.2.005',
        'body': 'v0.2.005 — Multi-program selection, Compare and Combine views for side-by-side program analysis.',
        'prerelease': False,
    },
    {
        'tag': 'v0.2.006',
        'file': 'reporting-workbench-0.2.006.zip',
        'name': 'Reporting Workbench v0.2.006',
        'body': 'v0.2.006 — App layout redesign: row layout, icon panel system, persistent config, module cache.',
        'prerelease': False,
    },
    {
        'tag': 'v0.2.007',
        'file': 'reporting-workbench-0.2.007.zip',
        'name': 'Reporting Workbench v0.2.007',
        'body': (
            'v0.2.007 — Runtime mock/live toggle in a single build. '
            'Toggle between live API and mock data from the API settings panel.'
        ),
        'prerelease': False,
    },
    {
        'tag': 'v0.2.008',
        'file': 'reporting-workbench-0.2.008.zip',
        'name': 'Reporting Workbench v0.2.008',
        'body': (
            'v0.2.008 — Security hardening: custom module code moved into isolated Worker, '
            'native fetch/XHR revoked in sandbox, Content Security Policy headers added.'
        ),
        'prerelease': False,
    },
    {
        'tag': 'v0.2.009',
        'file': 'reporting-workbench-0.2.009.zip',
        'name': 'Reporting Workbench v0.2.009',
        'body': 'v0.2.009 — Theme editor improvements, additional input validation for imported modules and themes.',
        'prerelease': False,
    },
    {
        'tag': 'v0.2.010',
        'file': 'reporting-workbench-0.2.010.zip',
        'name': 'Reporting Workbench v0.2.010',
        'body': 'v0.2.010 — OAuth 2.0 token refresh improvements, API version validation, array guard fixes.',
        'prerelease': False,
    },
    {
        'tag': 'v0.2.011',
        'file': 'reporting-workbench-0.2.011.zip',
        'name': 'Reporting Workbench v0.2.011',
        'body': 'v0.2.011 — Community contribution UI: module and theme submission workflow, /contribute endpoint.',
        'prerelease': False,
    },
    {
        'tag': 'v0.2.013',
        'file': 'reporting-workbench-0.2.013.zip',
        'name': 'Reporting Workbench v0.2.013',
        'body': 'v0.2.013 — Author credit added to community contributions.',
        'prerelease': False,
    },
    {
        'tag': 'v0.2.014',
        'file': 'reporting-workbench-0.2.014.zip',
        'name': 'Reporting Workbench v0.2.014',
        'body': 'v0.2.014 — Patch release with stability improvements.',
        'prerelease': False,
    },
    {
        'tag': 'v0.3.1',
        'file': 'reporting-workbench-0.3.001.zip',
        'name': 'Reporting Workbench v0.3.1',
        'body': (
            'v0.3.1 — Latest stable release.\n\n'
            '**What\'s included:**\n'
            '- All built-in report modules\n'
            '- Theme engine with editor\n'
            '- Community module/theme contribution workflow\n'
            '- OAuth 2.0 + Bearer token auth\n'
            '- Isolated sandboxed module execution\n'
            '- Mock data mode for offline use'
        ),
        'prerelease': False,
        'latest': True,
    },
]

for rel in RELEASES:
    tag = rel['tag']
    filepath = os.path.join(DIST, rel['file'])
    if not os.path.exists(filepath):
        print(f'SKIP {tag} — file not found: {rel["file"]}')
        continue

    print(f'Creating release {tag}...')
    try:
        payload = {
            'tag_name': tag,
            'target_commitish': 'main',
            'name': rel['name'],
            'body': rel['body'],
            'draft': False,
            'prerelease': rel['prerelease'],
            'make_latest': 'true' if rel.get('latest') else 'false',
        }
        result = gh_request('POST', f'{API}/repos/{REPO}/releases', body=payload)
        upload_url = result['upload_url'].split('{')[0]
        release_id = result['id']
        print(f'  Created release #{release_id}')
    except Exception as e:
        print(f'  FAILED to create release {tag}: {e}')
        continue

    asset_name = rel['file'].replace('-20260901', '')
    print(f'  Uploading {asset_name}...')
    try:
        with open(filepath, 'rb') as f:
            data = f.read()
        asset_result = gh_request(
            'POST',
            f'{upload_url}?name={asset_name}&label={asset_name}',
            body=data,
            headers={'Content-Type': 'application/zip'},
            binary=True,
        )
        print(f'  Asset uploaded: {asset_result.get("name")} ({asset_result.get("state")})')
    except Exception as e:
        print(f'  FAILED to upload asset: {e}')

print('\nDone.')
