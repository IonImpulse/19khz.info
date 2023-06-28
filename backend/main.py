import asyncio
import json
import re
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx
import csv
from io import StringIO
from typing import List
import dateparser
import uvicorn

BASE_URL = "https://19hz.info/events_"

NAME_KEY_DICT = {
    "Northern California": "BayArea",
    "Southern California": "LosAngeles",
    "Texas": "Texas",
    "Florida": "Miami",
    "Atlanta": "Atlanta",
    "Seattle": "Seattle",
    "Washington DC": "DC",
    "Iowa / Nebraska": "Iowa",
    "Chicago": "CHI",
    "Detroit": "Detroit",
    "Massachusetts": "Massachusetts",
    "Las Vegas": "LasVegas",
    "Phoenix": "Phoenix",
    "Portland / Vancouver": "PNW",
}

KEY_TIMEZONE_DICT = {
    "BayArea": "America/Los_Angeles",
    "LosAngeles": "America/Los_Angeles",
    "Texas": "America/Chicago",
    "Miami": "America/New_York",
    "Atlanta": "America/New_York",
    "Seattle": "America/Los_Angeles",
    "DC": "America/New_York",
    "Iowa": "America/Chicago",
    "CHI": "America/Chicago",
    "Detroit": "America/Detroit",
    "Massachusetts": "America/New_York",
    "LasVegas": "America/Los_Angeles",
    "Phoenix": "America/Phoenix",
    "PNW": "America/Los_Angeles",
}

app = FastAPI()

# Add CORS headers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

state = {"events": {}, "genres": []}

async def scrape_all() -> List[List[dict]]:
    events = {}

    print("Scraping 19hz.info...")

    for key in NAME_KEY_DICT.values():
        events[key] = await scrape_csv(key)

    # Consolidate genres
    genres = {}
    for key in events:
        for event in events[key]:
            for genre in event["genres"]:
                if genre in genres:
                    genres[genre] += 1
                else:
                    genres[genre] = 1

    print("Done scraping 19hz.info!")
    return events, genres

async def get_csv_file(url):
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        csv_data = response.text
        return list(csv.reader(StringIO(csv_data)))

async def scrape_csv(csv_key):
    csv_url = BASE_URL + csv_key + ".csv"

    print(f"Scraping {csv_url}...")

    # Read the data from the url
    csv_data = await get_csv_file(csv_url)

    events = []

    for row in csv_data:
        event = {}

        timestamp_start = None
        timestamp_end = ""

        # Parse the date and time
        date = row[0].lower()
        time = row[4].lower()

        date_start = None
        date_end = None

        time_start = None
        time_end = None

        # Parse the time
        # Use regex to remove the following sequences:
        # Capital, lowercase, lowercase, colon, space
        # This remove days such as "Fri:"
        time = re.sub(r"[A-Za-z][a-z][a-z]: ", "", time)
        date = re.sub(r"[A-Za-z][a-z][a-z]: ", "", date)

        # Remove any lingering days
        days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
        for day in days:
            time = time.replace(day, "")
            date = date.replace(day, "")

        # Clean the time string up a bit
        time = time.replace("-am", "am")
        time = time.replace("-pm", "pm")
        time = time.replace("-late", "")

        if "-" in time:
            time_start = parse_time(time.split("-")[0], csv_key)
            time_end = parse_time(time.split("-")[1], csv_key)
        else:
            time_start = parse_time(time, csv_key)
            time_end = None

        # Parse the date
        if "-" in date:
            date_start = parse_date(date.split("-")[0])
            date_end = parse_date(date.split("-")[1])

            if time_end is None:
                time_end = "23:59:00"
        else:
            date_start = parse_date(date)
            # Use parsed time to determine if the event ends
            # on the same day or the next day
            date_end = None

            if time_end is not None:
                if time_end < time_start:
                    date_end = date_start
                else:
                    date_end = increment_date(date_start, 1)
            else :
                date_end = date_start
                time_end = "23:59:00"
                    
        # Combine the date and time
        timestamp_start = date_start + "T" + time_start
        timestamp_end = date_end + "T" + time_end

        event["timestamp_start"] = timestamp_start
        event["timestamp_end"] = timestamp_end
        
        event["name"] = row[1]
        event["genres"] = [genre.strip() for genre in row[2].split(",")]
        event["location"] = row[3]
        event["price"] = row[5]
        event["age"] = row[6]
        event["organizer"] = row[7]
        event["ticket_link"] = row[8]
        event["event_link"] = row[9]

        events.append(event)

    return events

from datetime import datetime, timedelta
import pytz

MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]

def parse_date(date_string: str):
    date_string = date_string.strip()
    # Something along the lines of "Jun 6" or "Aug 29"
    month = date_string.split(" ")[0].strip()
    day = int(date_string.split(" ")[1].strip())

    # Determine if the date is this year or next year
    now = datetime.now()
    if MONTHS.index(month) < now.month:
        year = now.year + 1
    else:
        year = now.year
    
    # Format as YYYY-MM-DD, ensuring leading zeros
    date_string = f"{year}-{MONTHS.index(month) + 1:02d}-{day:02d}"

    return date_string

def get_number(str) -> int:
    try:
        return int(re.sub("[^0-9]", "", str)[:2])
    except Exception as e:
        print(f"Error parsing number in '{str}': {e}")
        return 0

def parse_time(time_string: str, csv_key: str):
    time_string = time_string.strip()
    ampm = None

    if "am" in time_string or "pm" in time_string:
        ampm = time_string[-2:]
        time_string = time_string[:-2]

    if ":" in time_string:
        hour = get_number(time_string.split(":")[0])
        minute = get_number(time_string.split(":")[1])
        ampm = time_string.split(":")[1]
    else:
        hour = get_number(time_string[:2])
        minute = 0
        ampm = time_string

    if ampm == "pm" and hour != 12:
        hour += 12
    elif ampm == "am" and hour == 12:
        hour = 0

    # Format as HH:MM:SS, ensuring leading zeros
    time_string = f"{hour:02d}:{minute:02d}:00"

    return time_string

def increment_date(yyyy_mm_dd, number_of_days):
    date = datetime.strptime(yyyy_mm_dd, "%Y-%m-%d")
    date += timedelta(days=number_of_days)
    return date.strftime("%Y-%m-%d")

@app.get("/events")
async def get_events():
    return state["events"]

@app.get("/genres")
async def get_genres():
    return state["genres"]

@app.get("/areas")
async def get_locations():
    return NAME_KEY_DICT


class BackgroundRunner:
    def __init__(self):
        return

    async def run_main(self):
        # Wait 10 seconds before starting the background tasks
        await asyncio.sleep(1)
        while True:
            # Scrape quiz results
            state["events"], state["genres"] = await scrape_all()

            # Save state to file
            with open("state.json", "w") as f:
                f.write(json.dumps(state))

            await asyncio.sleep(60 * 10)


runner = BackgroundRunner()

@app.on_event('startup')
async def app_startup():
    asyncio.create_task(runner.run_main())

if __name__ == "__main__":
    # Load state from file
    try :
        with open("state.json", "r") as f:
            state = json.loads(f.read())
    except:
        pass

    # Run the server
    uvicorn.run(app, host="127.0.0.1", port=8000)