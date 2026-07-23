"""
Google Sheets → data/content.json

Required environment variables:
  GOOGLE_CREDENTIALS  : service account JSON (entire contents)
  SPREADSHEET_ID      : spreadsheet ID from the URL

Spreadsheet structure:
  Sheet "お知らせ"  : A=日付  B=タイトル  C=内容  (row 1 = header)
  Sheet "ギャラリー": A=画像URL  B=キャプション  (row 1 = header)
"""

import json
import os
import sys

from google.oauth2 import service_account
from googleapiclient.discovery import build

SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"]


def build_service():
    creds_raw = os.environ.get("GOOGLE_CREDENTIALS", "")
    if not creds_raw:
        sys.exit("ERROR: GOOGLE_CREDENTIALS is not set")

    creds_info = json.loads(creds_raw)
    creds = service_account.Credentials.from_service_account_info(
        creds_info, scopes=SCOPES
    )
    return build("sheets", "v4", credentials=creds, cache_discovery=False)


def get_range(service, sheet_id, range_name):
    result = (
        service.spreadsheets()
        .values()
        .get(spreadsheetId=sheet_id, range=range_name)
        .execute()
    )
    return result.get("values", [])


def main():
    sheet_id = os.environ.get("SPREADSHEET_ID", "")
    if not sheet_id:
        sys.exit("ERROR: SPREADSHEET_ID is not set")

    service = build_service()

    # ---------- お知らせ (A=日付, B=タイトル, C=内容) ----------
    notice_rows = get_range(service, sheet_id, "お知らせ!A2:C")
    notices = []
    for row in notice_rows:
        if not any(row):
            continue
        notices.append(
            {
                "date": row[0].strip() if len(row) > 0 else "",
                "title": row[1].strip() if len(row) > 1 else "",
                "content": row[2].strip() if len(row) > 2 else "",
            }
        )

    # ---------- ギャラリー (A=画像URL, B=キャプション) ----------
    gallery_rows = get_range(service, sheet_id, "ギャラリー!A2:B")
    gallery = []
    for row in gallery_rows:
        url = row[0].strip() if len(row) > 0 else ""
        if not url:
            continue
        gallery.append(
            {
                "url": url,
                "caption": row[1].strip() if len(row) > 1 else "",
            }
        )

    data = {"notices": notices, "gallery": gallery}

    os.makedirs("data", exist_ok=True)
    with open("data/content.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"✓ {len(notices)} notices, {len(gallery)} gallery items → data/content.json")


if __name__ == "__main__":
    main()
