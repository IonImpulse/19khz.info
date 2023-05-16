const BASE_URL = "https://19hz.info/events_";

const NAME_KEY_DICT = {
    "San Francisco Bay Area / Northern California": "BayArea",
    "Los Angeles / Southern California": "LosAngeles",
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

const KEY_TIMEZONE_DICT = {
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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Nov", "Dec"];

async function scrapeAll() {
    let all_promises = [];

    for (const [key, value] of Object.entries(NAME_KEY_DICT)) {
        all_promises.push(scrapeCSV(value));
    }

    let events = await Promise.all(all_promises);

    console.log("Done scraping!");

    console.log(events);

    return events;
}

function asyncPapaParse(url) {
    return new Promise((resolve, reject) => {
        Papa.parse(url, {
            download: true,
            header: false,
            complete: function (results) {
                resolve(results.data)
            }
        })
    })
}

async function scrapeCSV(csv_key) {
    let csv_url = BASE_URL + csv_key + ".csv";

    // Use papaparse to parse the csv
    let csv_data = await asyncPapaParse(csv_url);

    console.log(csv_data);

    // Get the data from the csv
    let csv_data_array = csv_data
    // No header row in data, example row:
    /* 
    Sun: May 14	
    Subtract On The Pier | 8 Year w/ Desert Dwellers
    glitch-hop, dubstep, psydub, techno	
    Belmont Veterans Memorial Pier (Long Beach/Los Angeles)
    2pm-10pm
    $28.33
    21+
    Subtract Music	
    https://dice.fm/event/kamvl-subtract-on-the-pier-8-year-w-desert-dwellers-14th-may-belmont-veterans-memorial-pier-los-angeles-tickets	
    https://www.facebook.com/events/2471447939699791/
    */

    let events = [];

    for (let i = 0; i < csv_data_array.length; i++) {
        let event = {};

        let timestamp_start;
        let timestamp_end = null;

        // Time column
        // Case 1: single date
        if (!csv_data_array[i][0].contains("–")) {
            // Case 1.1: single date, with start and end time
            if (csv_data_array[i][4].contains("-")) {
                timestamp_start = parseTime(csv_data_array[i][0], csv_data_array[i][4].split("-")[0], csv_key);
                timestamp_end = parseTime(csv_data_array[i][0], csv_data_array[i][4].split("-")[1], csv_key);
            } else {
                // Case 1.2: single date, with only start time
                timestamp_start = parseTime(csv_data_array[i][0], csv_data_array[i][4], csv_key);
            }
        } else {
            // Case 2: date range
            let start_date = csv_data_array[i][0].split("–")[0].trim();
            let end_date = csv_data_array[i][0].split("–")[1].trim();

            let start_time = csv_data_array[i][4].split("-")[0].trim();
            let end_time = csv_data_array[i][4].split("-")[1].trim();

            timestamp_start = parseTime(start_date, start_time, csv_key);
            timestamp_end = parseTime(end_date, end_time, csv_key);
        }

        event["timestamp_start"] = timestamp_start;
        event["timestamp_end"] = timestamp_end;

        // Name column
        event["name"] = csv_data_array[i][1];

        // Genres column
        event["genres"] = csv_data_array[i][2].split(",").map(genre => genre.trim());

        // Location column
        event["location"] = csv_data_array[i][3];

        // Price column
        event["price"] = csv_data_array[i][5];

        // Age column
        event["age"] = csv_data_array[i][6];

        // Organizer
        event["organizer"] = csv_data_array[i][7];

        // Ticket link
        event["ticket_link"] = csv_data_array[i][8];

        // Event link, either facebook or website
        event["event_link"] = csv_data_array[i][9];

        events.push(event);
    }

    return events;
}

function parseTime(date_string, time_string, csv_key) {
    let date = date_string.split(":")[1].trim();
    // Date will be something like "May 14"
    let month = MONTHS[date.split(" ")[0]];
    let day = date.split(" ")[1];

    // Time can either be like 9pm or 9:30pm
    let hour;
    let minute;
    let ampm;

    if (time_string.contains(":")) {
        hour = time_string.split(":")[0];
        minute = time_string.split(":")[1].slice(0, -2);
        ampm = time_string.split(":")[1].slice(-2);
    } else {
        hour = time_string.slice(0, -2);
        minute = "00";
        ampm = time_string.slice(-2);
    }

    // Convert to 24 hour time
    if (ampm == "pm" && hour != 12) {
        hour = Number(hour) + 11;
    } else if (ampm == "am" && hour == 12) {
        hour = 0;
    } else {
        hour = Number(hour);
    }

    // Year is current year if month is in the future, else next year
    let year = new Date().getFullYear();
    if (MONTHS.indexOf(month) < new Date().getMonth()) {
        year += 1;
    }

    // Account for timezone from csv_key
    let timezone = KEY_TIMEZONE_DICT[csv_key];

    // Create timestamp
    let timestamp = new Date(year, MONTHS.indexOf(month), day, hour, minute, 0, 0, timezone);

    return timestamp;
}

scrapeAll();