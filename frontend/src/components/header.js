import React from 'react';
import './header.css';

export default function Header(props) {
    console.log(props.areas);

    return (
        <div id="header">
            <div id="branding">
                <img id="logo" src="logo.svg" width="64px"></img>
                <h1>19kHz.info</h1>
            </div>
            <div id="areas">
                {Object.keys(props.areas).map(area => {
                    return (
                        <button className="area" key={area} onClick={() => props.setSelectedArea(props.areas[area])}>
                            {area}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
