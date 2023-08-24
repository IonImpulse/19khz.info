import React from 'react';
import './header.css';

function getDistance(origin, destination) {
    let lat1 = origin[0], lon1 = origin[1];
    let lat2 = destination[0], lon2 = destination[1];
  
    const radius  = 6371; // km

    let dlat = Math.radians(lat2 - lat1);
    let dlon = Math.radians(lon2 - lon1);
    let a = (Math.sin(dlat / 2) * Math.sin(dlat / 2) +
            Math.cos(Math.radians(lat1)) * Math.cos(Math.radians(lat2)) *
            Math.sin(dlon / 2) * Math.sin(dlon / 2));
    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    let d = radius * c * 0.6213712;

    return d;
}

function getDistanceEvent(origin, event) {
    let lat1 = origin[0], lon1 = origin[1];
    let lat2 = event.location.lat, lon2 = event.location.lon;
  
    return getDistance([lat1, lon1], [lat2, lon2]);
}

// Convert Degree to Radian
Math.radians = function(degrees) {
    return degrees * Math.PI / 180;
};

const options = {
    enableHighAccuracy: false,
    timeout: 5000,
    maximumAge: 0,
  };

function tryGeolocation(setLocation) {
    if (navigator.geolocation) {
        console.log("Geolocation is supported!");
        navigator.geolocation.getCurrentPosition(position => {
            setLocation([position.coords.latitude, position.coords.longitude]);
            console.log("Your location is: ", position.coords.latitude, position.coords.longitude);
        }, error => {
            console.log("Geolocation failed: ", error);
        }, options);
    }
}

export default function Header(props) {
    if (props.loading > 0) {
        return;
    }

    return (
        <div id="header">
            <div id="branding">
                <h1>19kHz.<span>info</span></h1>
            </div>
            <div id="filters">
                <div id="areas-container">
                    <select id="areas" onChange={(e) => props.setSelectedArea(e.target.value == "all" ? "all" : props.areas[e.target.value])}>
                        <option value="all">All Areas</option>
                        {Object.keys(props.areas).map(area => {
                            return (
                                <option value={area}>{area}</option>
                            );
                        })}
                    </select>
                </div>

                <div id="city-container">
                    <select id="city" onChange={(e) => props.setSelectedCity(e.target.value)}>
                        <option value="all">All Cities</option>
                        {Object.keys(props.cities[props.selectedArea]).filter(city => props.cities[props.selectedArea][city] >= 10).map(city => {
                            return (
                                <option value={city}>{city}</option>
                            );
                        })}
                        <option value="other">Other</option>
                    </select>
                </div>

                <div id="age-container">
                    <h2>Age</h2>
                    <label for="age">All Ages</label>
                    <input type="checkbox" id="age" name="age" value="all"></input>
                    
                    <label for="age">18+</label>
                    <input type="checkbox" id="age" name="age" value="18"></input>
                    
                    <label for="age">21+</label>
                    <input type="checkbox" id="age" name="age" value="21"></input>
                </div>
            </div>
        </div>
    );
}
