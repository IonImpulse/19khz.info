import React from 'react';
import './eventList.css';

function getMonthDayFromTimestamp(timestamp) {
    const date = new Date(timestamp);
    const month = date.toLocaleString('default', { month: 'short' });
    let day = date.getDate();
    const day_int = date.getDate();
    const day_of_week = date.toLocaleString('default', { weekday: 'short' });

    if (day === 1) {
        day += "st";
    } else if (day === 2) {
        day += "nd";
    } else if (day === 3) {
        day += "rd";
    } else {
        day += "th";
    }

    return { month, day, day_int, day_of_week };
}

export default function EventList(props) {
    const [current_events, setCurrentEvents] = React.useState([]);
    const [renderNum, setRenderNum] = React.useState(20);

    React.useEffect(() => {
        setRenderNum(20);

        let temp_current_events = [];

        if (props.selectedArea === null) {
            temp_current_events = [];
        } else if (props.selectedArea === "all") {
            temp_current_events = Object.values(props.events).flat(1);
        } else {
            temp_current_events = props.events[props.selectedArea];
        }

        // Filter out events that have already passed
        // Still show events that are happening today
        // Can only use timestamp_start because timestamp_end is not always available
        temp_current_events = temp_current_events.filter(event => {
            let start = new Date(event.timestamp_start);
            let now = new Date();

            now.setHours(0, 0, 0, 0);

            return start >= now;
        });

        // Sort by timestamp start, then by timestamp end
        temp_current_events.sort((a, b) => {
            if (new Date(a.timestamp_start) < new Date(b.timestamp_start)) {
                return -1;
            } else {
                return 1;
            }
        });

        setCurrentEvents(temp_current_events);

    }, [props.events, props.selectedArea]);

    React.useEffect(() => {
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    function handleScroll() {
        // Every time the user scrolls to the bottom of the page, render 20 more events
        // add a small buffer to the bottom of the page so that the user doesn't have to scroll all the way to the bottom
        const buffer = 500;

        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - buffer) {
            setRenderNum(prevNum => prevNum + 20)
        }
    }

    function openTicket(e, event) {
        // Block the event div from opening
        e.stopPropagation();

        // Open the ticket link in a new tab
        window.open(event.ticket_link, "_blank");
    }

    function openEvent(e, event) {
        // Block the event div from opening
        e.stopPropagation();

        // Open the event link in a new tab
        window.open(event.event_link, "_blank");
    }

    function isEventSaved(event) {
        // Check if the event is already saved
        for (let e of props.savedEvents) {
            if (e.name === event.name && e.ticket_link === event.ticket_link) {
                return true;
            }
        }
        return false;
    }

    function toggleSaveEvent(e, event) {
        // Block the event div from opening
        e.stopPropagation();

        // If the event is already saved, remove it from the saved events list
        // Otherwise, add it to the saved events list
        if (isEventSaved(event)) {
            props.setSavedEvents(prev => prev.filter(e => e.name !== event.name && e.ticket_link !== event.ticket_link));
        } else {
            props.setSavedEvents(prev => [...prev, event]);
        }
    }

    function timestampToTime(timestamp) {
        let return_string = "";

        let start = new Date(timestamp);
        
        let start_hour = start.getHours();
        let start_minutes = start.getMinutes();
        let start_ampm = "AM";

        if (start_hour > 12) {
            start_hour -= 12;
            start_ampm = "PM";
        } else if (start_hour === 12) {
            start_ampm = "PM";
        } else if (start_hour === 0) {
            start_hour = 12;
        }

        return_string += start_hour;

        if (start_minutes !== 0) {
            return_string += ":";

            if (start_minutes < 10) {
                start_minutes = "0" + start_minutes;
            }

            return_string += start_minutes;
        }

        return_string += start_ampm;

        return return_string;
    }

    function generateTimeInfo(event) {
        // Generate a string like "10PM - 2:30AM"
        // or "9:45PM" if no end time is available
        let return_string = "";

        let start = timestampToTime(event.timestamp_start);

        if (event.timestamp_end) {
            let end = timestampToTime(event.timestamp_end);

            return_string += `${start} - ${end}`;
        } else {
            return_string += start;
        }

        return return_string;
    }

    function generateLocationLink(event) {
        // Open the location in Google Maps, using general search of city, venue, and state
        // not the exact coordinates
        const str = `https://www.google.com/maps/search/${event.location.venue}, ${event.location.city}, ${event.location.state}`;
        
        // Url encode the string
        return encodeURI(str);
    }

    function generateAgeDiv(age) {
        // Generate a div with age info.
        // Age will be null, 0, 18, or 21

        return (
            <div className="event-age">
                <span className={age === 0 ? "highlight all-ages" : ""}>All</span>
                <span className={age === 18 ? "highlight over-18" : ""}>18+</span>
                <span className={age === 21 ? "highlight over-21" : ""}>21+</span>
            </div>
        )
    }

    /*
    JSON fields in event object:
        "timestamp_start": "2024-07-01T02:00:00",
        "timestamp_end": "2024-07-02T10:00:00",
        "name": "Back2Beach",
        "genres": [
            "dubstep",
            "bass music",
            "drum and bass"
        ],
        "location": {
            "city": "San Francisco",
            "venue": "Ocean Beach",
            "state": "California",
            "lat": "37.7558",
            "lon": "-122.4449"
        },
        "price": "free",
        "age": "All ages",
        "organizer": "Seize the Bass, Sounds From the Bassment",
        "ticket_link": "https://www.instagram.com/p/Ctvag0frpnm/",
        "event_link": ""
    */
    return (
        <div id="event-list">
            {
            // Lazy load events, 
            // only render the first 20 events,
            // then render 20 more when the user scrolls to the bottom
                
            current_events.filter(event => {
                // Filter by selected city
                if (props.selectedCity !== "all") {
                    if (event.location.city !== props.selectedCity) {
                        return false;
                    }
                }

                return true;
            }).slice(0, renderNum).map(event => {
                let start = getMonthDayFromTimestamp(event.timestamp_start);

                let prev_is_diff_day = (<></>);
                
                if (current_events.indexOf(event) > 0) {
                    const prev_event = current_events[current_events.indexOf(event) - 1];
                    const prev_start = getMonthDayFromTimestamp(prev_event.timestamp_start);

                    if (prev_start.day_int !== start.day_int) {
                        prev_is_diff_day = (
                            <div className="divider">
                            </div>
                        );
                    }
                }

                // This string will inform people of when the event starts
                // and ends on that day
                let time_info = generateTimeInfo(event);

                return (
                    <>
                    {prev_is_diff_day}

                    <div className="event" key={event.id}>
                        <div className="date-info">
                            <div className="date">
                                <div className="month">{start.month}</div>
                                <div className="day">{start.day}</div>
                                <div className="day-of-week">{start.day_of_week}</div>
                            </div>
                        </div>
                        <div className="general-info">
                            <div className="name">{event.name}</div>
                            <div className="time">{time_info}</div>

                            <div className="genres">{event.genres.map(
                                (genre, index) => {
                                    return (
                                        <button className="genre" key={index}>{genre}</button>
                                    );
                                }
                            )}</div>
                            <div className="location"><a href={generateLocationLink(event)} target="_blank" rel="noreferrer">
                                {event.location.venue}, {event.location.city}, {event.location.state}
                            </a></div>
                            <div className="organizer">{event.organizer}</div>
                        </div>
                        <div className="ticket-info">
                            <div className="price">{event.price ?? "$???"}</div>
                            <div className="age">{generateAgeDiv(event.age)}</div>
                            {event.ticket_link != "" ? <button className="ticket-button" onClick={(e) => openTicket(e, event)}>Tickets</button> : ""}
                            {event.event_link != "" ? <button className="event-button" onClick={(e) => openEvent(e, event)}>More Info</button> : ""}
                        </div>
                        <div className="save-container">
                            <button aria-label="Save event" className={`save-icon ${isEventSaved(event) ? "saved" : ""}`} onClick={(e) => toggleSaveEvent(e, event)}></button>
                        </div>
                    </div>
                    </>
                );
            })}
        </div>
    );
}