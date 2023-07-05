import React from 'react';
import './eventList.css';

function getMonthDayFromTimestamp(timestamp) {
    const date = new Date(timestamp);
    const month = date.toLocaleString('default', { month: 'short' });
    let day = date.getDate();
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

    return { month, day, day_of_week };
}

export default function EventList(props) {
    const [current_events, setCurrentEvents] = React.useState([]);
    const [renderNum, setRenderNum] = React.useState(20);

    React.useEffect(() => {
        let temp_current_events = [];

        if (props.selectedArea === null) {
            temp_current_events = [];
        } else if (props.selectedArea === "all") {
            temp_current_events = Object.values(props.events).flat(1);
        } else {
            temp_current_events = props.events[props.selectedArea];
        }

        // Filter out even

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
            {current_events.map(event => {
                let start = getMonthDayFromTimestamp(event.timestamp_start);

                return (
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
                            <div className="genres">{event.genres.join(", ")}</div>
                            <div className="location">{event.location.venue}, {event.location.city}, {event.location.state}</div>
                            <div className="organizer">{event.organizer}</div>
                        </div>
                        <div className="ticket-info">
                            <div className="price">{event.price ?? "$???"}</div>
                            <div className="age">{event.age ?? "No age specified"}</div>
                            {event.ticket_link != "" ? <div><a href={event.ticket_link}>Tickets</a></div> : ""}
                            {event.event_link != "" ? <div><a href={event.event_link}>More Info</a></div> : ""}
                            
                            
                        </div>
                    </div>
                );
            })}
        </div>
    );
}