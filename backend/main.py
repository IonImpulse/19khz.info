import asyncio
import json
import re
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx
import csv
from io import StringIO
from typing import List
from datetime import datetime, timedelta
import uvicorn

'''

Uses data from https://simplemaps.com/data/world-cities.

'''

BASE_URL = "https://19hz.info/events_"

KEY_NAME_DICT = {
    "BayArea": "Northern California",
    "LosAngeles": "Southern California",
    "Texas": "Texas",
    "Miami": "Florida",
    "Atlanta": "Atlanta",
    "Seattle": "Seattle",
    "DC": "Washington DC",
    "Iowa": "Iowa / Nebraska",
    "CHI": "Chicago",
    "Detroit": "Detroit",
    "Massachusetts": "Massachusetts",
    "LasVegas": "Las Vegas",
    "Phoenix": "Phoenix",
    "PNW": "Portland / Vancouver",
}

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

US_AND_CANDADIAN_STATES = {
    'AK': 'Alaska',
    'AL': 'Alabama',
    'AR': 'Arkansas',
    'AS': 'American Samoa',
    'AZ': 'Arizona',
    'CA': 'California',
    'CO': 'Colorado',
    'CT': 'Connecticut',
    'DC': 'District of Columbia',
    'DE': 'Delaware',
    'FL': 'Florida',
    'GA': 'Georgia',
    'GU': 'Guam',
    'HI': 'Hawaii',
    'IA': 'Iowa',
    'ID': 'Idaho',
    'IL': 'Illinois',
    'IN': 'Indiana',
    'KS': 'Kansas',
    'KY': 'Kentucky',
    'LA': 'Louisiana',
    'MA': 'Massachusetts',
    'MD': 'Maryland',
    'ME': 'Maine',
    'MI': 'Michigan',
    'MN': 'Minnesota',
    'MO': 'Missouri',
    'MP': 'Northern Mariana Islands',
    'MS': 'Mississippi',
    'MT': 'Montana',
    'NA': 'National',
    'NC': 'North Carolina',
    'ND': 'North Dakota',
    'NE': 'Nebraska',
    'NH': 'New Hampshire',
    'NJ': 'New Jersey',
    'NM': 'New Mexico',
    'NV': 'Nevada',
    'NY': 'New York',
    'OH': 'Ohio',
    'OK': 'Oklahoma',
    'OR': 'Oregon',
    'PA': 'Pennsylvania',
    'PR': 'Puerto Rico',
    'RI': 'Rhode Island',
    'SC': 'South Carolina',
    'SD': 'South Dakota',
    'TN': 'Tennessee',
    'TX': 'Texas',
    'UT': 'Utah',
    'VA': 'Virginia',
    'VI': 'Virgin Islands',
    'VT': 'Vermont',
    'WA': 'Washington',
    'WI': 'Wisconsin',
    'WV': 'West Virginia',
    'WY': 'Wyoming',
    'AB': 'Alberta',
    'BC': 'British Columbia',
    'MB': 'Manitoba',
    'NB': 'New Brunswick',
    'NL': 'Newfoundland and Labrador',
    'NT': 'Northwest Territories',
    'NS': 'Nova Scotia',
    'NU': 'Nunavut',
    'ON': 'Ontario',
    'PE': 'Prince Edward Island',
    'QC': 'Quebec',
    'SK': 'Saskatchewan',
    'YT': 'Yukon'
}

CITIES = []

app = FastAPI()

# Add CORS headers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

state = {"events": {}, "genres": {}, "cities": {}}

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

    # Consolidate cities
    cities = {"all": {}}
    
    for key in events:
        cities[key] = {}

        for event in events[key]:
            current_city = event["location"]["city"]

            if current_city in cities[key]:
                cities[key][current_city] += 1
            else:
                cities[key][current_city] = 1

            if current_city in cities["all"]:
                cities["all"][current_city] += 1
            else:
                cities["all"][current_city] = 1 

    print("Done scraping 19hz.info!")
    return events, genres, cities

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
        event["genres"] = []

        for genre in row[2].split(","):
            if genre.strip() != "":
                event["genres"].append(genre.strip())

        event["location"] = get_location_obj(row[3], csv_key)
        event["price"] = row[5].strip() if row[5].strip() != "" else None
        event["age"] = normalize_age(row[6])
        event["organizer"] = row[7]
        event["ticket_link"] = row[8]
        event["event_link"] = row[9]


        events.append(event)

    return events

def normalize_age(age_string):
    age = age_string.strip() if age_string.strip() != "" else None

    if age is None:
        return None

    if "21" in age:
        return 21
    elif "18" in age:
        return 18
    else:
        return 0

def get_location_obj(location_string, csv_key):
    # Venue name is first, then the city is in parentheses
    # If no city is specified, just put blank
    location = {}

    if "(" in location_string and ")" in location_string:
        location["city"] = location_string.split("(")[1].split(")")[0]
        location["venue"] = location_string.split("(")[0].strip() 

        # If there's a comma, there's a state
        if location["city"].count(",") == 1:
            location["state"] = US_AND_CANDADIAN_STATES[location["city"].split(",")[1].strip()]
            location["city"] = location["city"].split(",")[0].strip()
        elif location["city"].count(",") == 2:
            # Discard the first value
            location["state"] = US_AND_CANDADIAN_STATES[location["city"].split(",")[2].strip()]
            location["city"] = location["city"].split(",")[1].strip()
            
        else:
            location["state"] = KEY_NAME_DICT[csv_key]
    else:
        location["city"] = ""
        location["venue"] = location_string.strip()
        location["state"] = KEY_NAME_DICT[csv_key]

    # Try to get the lat and long
    try:
        # Iterate through cities.csv and try to find a match
        # Fields are: "city_ascii","lat","lng","country","iso2","iso3","admin_name","capital","population","id"
        # Admin name is full state name

        found = None

        if "California" in location["state"]:
            location["state"] = "California"

        for row in CITIES:
            if row[0].lower() == location["city"].lower() and row[6].lower() == location["state"].lower():
                found = row
                break

        if found is not None:
            location["lat"] = found[1]
            location["lon"] = found[2]
        else:
            location["lat"] = None
            location["lon"] = None

    except Exception as e:
        print(f"Error getting lat and long for {location['city']}, {location['state']}: {e}")
        location["lat"] = None
        location["lon"] = None

    return location



MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]

def parse_date(date_string: str):
    date_string = date_string.strip()
    # Something along the lines of "Jun 6" or "Aug 29"
    month = date_string.split(" ")[0].strip().replace(",", "")
    day = int(date_string.split(" ")[1].strip().replace(",", ""))

    # Determine if the date is this year or next year
    now = datetime.now()

    if MONTHS.index(month) + 1 < now.month:
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
    else:
        hour = get_number(time_string[:2])
        minute = 0

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

@app.get("/cities")
async def get_cities():
    return state["cities"]

class BackgroundRunner:
    def __init__(self):
        return

    async def run_main(self):
        # Wait 10 seconds before starting the background tasks
        await asyncio.sleep(1)
        while True:
            # Scrape quiz results
            state["events"], state["genres"], state["cities"] = await scrape_all()

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

    # Load worldcities.csv
    with open("cities.csv", "r", encoding="utf8") as f:
        reader = csv.reader(f)
        
        # Skip the first line
        next(reader)

        # Load the rest of the lines
        CITIES = [row for row in reader]

        
    # Run the server
    uvicorn.run(app, host="127.0.0.1", port=8000)