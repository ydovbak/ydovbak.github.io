"use strict";
const ApiKey = 'c7a1e555a10286246f98bca3cbecc656';
let lat;                        // ltitude of the searched city
let lon;                        // longitude of the searched city
let mainAPIresponse;            // response with current and weekly weather forecast
let threeHourAPIresponse;       // response with 3-hour breakdown for next 7 days
let tabId = 0;                  // the index of day tab that was clicked
let unit = 'metric';            // measurement units of the web page         
let temp = "&deg;C";            // format of temperature output (C/F)
let distance = "m";             // format of the distance output (meters/miles)
let chartType = 'temperature';  // type of the chart chosen by user
let cities = [];                // list of all city objects available to search through
let map;

const $ = (selector) => document.querySelector(selector);

window.onload = () => {

    //
    // parse the city data
    //
    let citiesJSONpath = 'city.list.json';
    ajaxGetRequest(citiesJSONpath, (err, response) => {
        if (err) {
            console.log('Failed loading cities');
        } else {
            cities = response.map(city => {
                return { name: city.name, lat: city.coord.lat, lon: city.coord.lon, country: city.country };
            });
        }
    });

    //
    // geolocation
    //
    console.log('Determinning location...');
    navigator.geolocation.getCurrentPosition((pos) => {
        console.log(pos.coords);
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;

        // performing API calls, fetching data
        console.log('Location found, fetching data...');
        updateUI(lat, lon, unit);

        // initialize leaflet maps
        map = L.map('mapid', {
            scrollWheelZoom: false
        }).setView([lat, lon], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

    }, err => {
        alert('Could not determine geo location, please enter your city');
        console.error(err);

        // set the template for map when it will be searched by user
        map = L.map('mapid', {
            scrollWheelZoom: false
        });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
    });



    //
    // autocomplete panel
    //
    $('#search-city-input').addEventListener('input', (event) => {

        // <ul> element of the autocomplete panel
        const acListEl = $('#autocomplete-list');
        let citySearchName = event.target.value;

        // search is not performed until user input is more than 2 chars
        if (citySearchName.length < 2) {
            acListEl.innerHTML = '';
            return;
        }

        // filtering 5 cities that start with same chars as user input
        const pattern = new RegExp(`${citySearchName}`, 'i');
        const filteredCities = cities.filter(city => pattern.test(city.name)).slice(0, 5);

        // remove all children that were created previously
        acListEl.innerHTML = '';

        for (let cityId = 0; cityId < filteredCities.length; cityId++) {

            // create <li> element for each city that matched the search
            const acItemEl = document.createElement('li');
            acItemEl.classList.add('list-group-item', 'list-group-item-action', 'autocomplete-item');
            acItemEl.innerHTML = `${filteredCities[cityId].name}, ${filteredCities[cityId].country}`;
            acItemEl.setAttribute("data-index", cityId)

            // appending the <li> into <ul>
            acListEl.appendChild(acItemEl);

            acItemEl.addEventListener('click', (event) => {
                // Getting the index of <li> that was clicked
                const cityIndex = parseInt(event.target.attributes['data-index'].value);
                lat = filteredCities[cityIndex].lat;
                lon = filteredCities[cityIndex].lon;
                $('#search-city-input').value = "";
                updateUI(lat, lon, unit);
                updateMap();
                hideAutocompletePanel();
            });
        }
    });

    // show autocomplete panel when search bar in focus
    $('#search-city-input').addEventListener('focus', () => {
        //finding the location where panel must appear
        placeAutocompletePanel();
        showAutocompletePanel();
    });


    // hide autocomplete panel when user clicks outside the panel
    document.addEventListener('click', (event) => {

        const panelEl = $('#autocomplete-panel');
        // checking if user clicked on search bar input
        const isInput = event.target === $('#search-city-input');
        // check if clicked within panel
        const isWithinPanel = panelEl.contains(event.target);

        if (!isInput && !isWithinPanel) {
            hideAutocompletePanel();
        }
    });

    // reposition autocomplete panel when window is resized
    window.addEventListener("resize", () => {
        placeAutocompletePanel();
    });



    //
    // Imperial - Metric Click listeners 
    //
    $("#imperial").addEventListener('click', () => {

        // check if units should be changed
        if (unit != "imperial") {
            unit = "imperial";

            // resetting the data in the UI
            updateUI(lat, lon, unit);
        }
    });

    $("#metric").addEventListener('click', () => {
        if (unit != "metric") {
            unit = "metric";
            updateUI(lat, lon, unit);
        }
    });

    //
    // weekly panel 
    //
    const tabs = document.querySelectorAll(".nav-link");
    for (let i = 0; i < tabs.length; i++) {
        tabs[i].addEventListener('click', (event) => {
            tabId = i;
            console.log('clicked' + i);
            fillHourlyBreakdown(threeHourAPIresponse);
        });
    };
}; //end of window.onload()


const updateUI = (lat, lon, unit) => {
    // seting units and dropdown
    if (unit == "metric") {
        $('#dropdown').innerText = "Metric";
        temp = "&deg;C";
        distance = "m";
    } else {
        $('#dropdown').innerText = "Imperial";
        temp = "&deg;F";
        distance = "ml";
    }

    // making API calls with updated parameters
    getForecast5days(lat, lon, unit, handle5daysForecastCallback);
    getCurrDayWeather(lat, lon, unit, handleCurrDayForecastCallback);
    getAirPollutionForecast(lat, lon, unit, handleAirPolutionForecastCallback)
};

const handleCurrDayForecastCallback = (err, response) => {
    if (err) {
        console.log("Error in API call");
        console.log(err);
    } else {
        mainAPIresponse = response;
        fillMainWeatherPanel(mainAPIresponse);
    }
};

const handleAirPolutionForecastCallback = (err, response) => {
    if (err) {
        console.log("Error in API call");
        console.log(err);
    } else {
        mainAPIresponse = response;
        fillAirPollutionPanel(mainAPIresponse);
    }
};

const handle5daysForecastCallback = (err, response) => {
    if (err) {
        alert('Error in API call');
    } else {
        const city = response.city;
        $('#city-name').innerText = city.name;
        console.log(response);
        fillThreeHourBreakdownPanel(response);
    }
};

const getCurrDayWeather = (lat, lon, unit, callback) => {
    const parts = 'minutely,hourly,alerts';
    const URL = `https://api.openweathermap.org/data/2.5/weather?units=${unit}&lat=${lat}&lon=${lon}&appid=${ApiKey}`;
    console.log(URL);
    ajaxGetRequest(URL, callback);
};

const getForecast5days = (lat, lon, unit, callback) => {
    const URL = `https://api.openweathermap.org/data/2.5/forecast?&units=${unit}&lat=${lat}&lon=${lon}&appid=${ApiKey}`;
    ajaxGetRequest(URL, callback);
};

const getAirPollutionForecast = (lat, lon, unit, callback) => {
    const URL = `https://api.openweathermap.org/data/2.5/air_pollution/forecast?lat=${lat}&lon=${lon}&appid=${ApiKey}`;
    ajaxGetRequest(URL, callback);
}

const ajaxGetRequest = (url, callback) => {
    const xhr = new XMLHttpRequest();
    xhr.responseType = "json";

    xhr.onreadystatechange = () => {
        if (xhr.readyState == 4) {
            // all good
            if (xhr.status >= 200 && xhr.status < 400) {
                callback(null, xhr.response);
            } else {
                callback(xhr, null);
            }
        }
    };
    xhr.onerror = e => console.log(e.message);
    xhr.open("GET", url);
    xhr.send();
};



// filling data about current weather into front panel shown to user
const fillMainWeatherPanel = (currWeather) => {
    $('#temperature').innerHTML = parseInt(currWeather.main.temp) + " " + temp;
    $('#feels-like').innerHTML = " " + parseInt(currWeather.main.feels_like) + " " + temp;
    $('#humidity').innerText = " " + currWeather.main.humidity + " %";
    $('#wind-speed').innerText = " " + currWeather.wind.speed + " " + distance + "/s";
    $('#wind-dir').innerText = " " + getCardinalDirectionAndArrow(currWeather.wind.deg);
    $('#clouds').innerText = currWeather.clouds.all + " %";
    $('#pressure').innerText = " " + (currWeather.main.pressure / 100) + " mb"; //Converting pressure from hpa to mb
    $('#weather-icon').src = `https://openweathermap.org/img/wn/${currWeather.weather[0].icon}@4x.png`;

    // setting visibility distance
    if (unit == "metric") {
        // visibility is given in meters in API, converting to km
        $('#visibility').innerText = " " + (parseInt(currWeather.visibility) / 1000) + " km";
    } else {
        $('#visibility').innerText = " " + currWeather.visibility + " miles";
    }
};

// filling data in a form of 3 hour forecast for next 5 days
const fillThreeHourBreakdownPanel = (response) => {
    // writing country name
    $('#city-name').innerText += ', ' + response.city.country;

    threeHourAPIresponse = response.list;
    fillHourlyBreakdown(threeHourAPIresponse);
}

const fillHourlyBreakdown = (threeHourAPIresponse) => {
    const weekDates = setTabsNames(threeHourAPIresponse[0].dt);
    let htmlOutput = "";
    for (let forecast of threeHourAPIresponse) {
        let date = new Date(forecast.dt * 1000);

        // check if the tab chosen by user corresponds to datetime of forecast
        if (weekDates[tabId].getDay() == date.getDay()) {
            // writing to the table
            htmlOutput += `<div class="col"><p> <span class='brand-line'>${date.getHours()}:00</span></p>
                <p class='my-2 py-2 temp-text'>${Math.round(forecast.main.temp)} ${temp} <img src="https://openweathermap.org/img/wn/${forecast.weather[0].icon}@2x.png" width='40px' hight='40px'></p>
                <p class='pb-1 mb-0'><i class="fas fa-cloud brand-color"></i> ${forecast.clouds.all}%</p>
                <p class='py-1 my-0'><i class="fas fa-tint brand-color"></i> ${forecast.main.humidity}%</p>
                <p class='py-1 my-0'><i class="fas fa-stopwatch brand-color"></i> ${forecast.main.pressure / 100} mb</p>
                <p class='pt-1 mt-0'> <span class='brand-color'>${getCardinalArrow(forecast.wind.deg)}</span> ${forecast.wind.speed} ${distance}/s</p>
                </div>` ;
        }
        $('#daily-panel').innerHTML = htmlOutput;
    }
}

const fillAirPollutionPanel = (response) => {
    let groupedData = {};

    // Group data by date
    response.list.forEach(entry => {
        let date = new Date(entry.dt * 1000).toISOString().split('T')[0];
        if (!groupedData[date]) {
            groupedData[date] = [];
        }
        groupedData[date].push(entry);
    });

    // Generate Bootstrap row and col layout
    let output = '<div class="container">';

    Object.keys(groupedData).forEach(date => {
        let entries = groupedData[date];
        let avgAqi = entries.reduce((sum, e) => sum + e.main.aqi, 0) / entries.length;
        let avgPm25 = entries.reduce((sum, e) => sum + e.components.pm2_5, 0) / entries.length;
        let avgPm10 = entries.reduce((sum, e) => sum + e.components.pm10, 0) / entries.length;
        let avgNo2 = entries.reduce((sum, e) => sum + e.components.no2, 0) / entries.length;
        let avgSo2 = entries.reduce((sum, e) => sum + e.components.so2, 0) / entries.length;
        let avgO3 = entries.reduce((sum, e) => sum + e.components.o3, 0) / entries.length;
        let aqiColor = getAqiColor(avgAqi);

        output += `
            <div class="row mb-3">
                <div class="col-12 bg-light p-3 rounded shadow-sm">
                    <h4 class="text-center">
                        ${date} 
                        <span class="aqi-indicator" style="display: inline-block; width: 15px; height: 15px; border-radius: 50%; background: ${aqiColor}; margin-left: 10px;"></span>
                    </h4>
                    <div class="row">
                        <div class="col-md-2"><strong>Avg AQI:</strong> ${avgAqi.toFixed(1)}</div>
                        <div class="col-md-2"><strong>PM2.5:</strong> ${avgPm25.toFixed(1)}</div>
                        <div class="col-md-2"><strong>PM10:</strong> ${avgPm10.toFixed(1)}</div>
                        <div class="col-md-2"><strong>NO2:</strong> ${avgNo2.toFixed(1)}</div>
                        <div class="col-md-2"><strong>SO2:</strong> ${avgSo2.toFixed(1)}</div>
                        <div class="col-md-2"><strong>O3:</strong> ${avgO3.toFixed(1)}</div>
                    </div>
                </div>
            </div>`;
    });
    
    output += '</div>';
    $("#air-pollution-panel").innerHTML = output;
};

// Function to determine AQI color
const getAqiColor = (aqi) => {
    if (aqi <= 1) return 'green';
    if (aqi <= 2) return 'yellow';
    if (aqi <= 3) return 'orange';
    if (aqi <= 4) return 'red';
    if (aqi <= 5) return 'purple';
    return 'brown';
}


// set days of the tabs corresponding to API response data available
// datetime - is the first datetime available in the response list
// of the three hour weather API call
const setTabsNames = (datetime) => {
    let weekDates = [];
    let firstDate = new Date(datetime * 1000);
    weekDates.push(firstDate);

    $('#tab-1').innerText = getNameOfDay(firstDate.getDay());

    // figure out consequent days and set appropriate tab names
    const secondDate = new Date(firstDate.getTime() + 86400000);
    $('#tab-2').innerText = getNameOfDay(secondDate.getDay());
    weekDates.push(secondDate);

    const thirdDate = new Date(secondDate.getTime() + 86400000);
    $('#tab-3').innerText = getNameOfDay(thirdDate.getDay());
    weekDates.push(thirdDate);

    const fourthDate = new Date(thirdDate.getTime() + 86400000);
    $('#tab-4').innerText = getNameOfDay(fourthDate.getDay());
    weekDates.push(fourthDate);

    const fifthDate = new Date(fourthDate.getTime() + 86400000);
    $('#tab-5').innerText = getNameOfDay(fifthDate.getDay());
    weekDates.push(fifthDate);

    return weekDates;
}

// extracting dates as lables; temp/humidity/cloudiness as data
const extractLabelsAndData = (type, daily) => {

    const labels = [];
    const data = [];
    // dd = day data
    for (const dd of daily) {

        const date = new Date(dd.dt * 1000);
        const day = date.getDate();
        const month = date.getMonth() + 1;
        labels.push(day + '/' + month);

        if (type == 'temperature') {
            data.push(dd.temp.day);
        } else if (type == 'humidity') {
            data.push(dd.humidity);
        } else if (type === 'cloudiness') {
            data.push(dd.clouds);
        }
    }

    // return object with two arrays
    return {
        labels: labels,
        data: data
    };
}

// method for creating and updating charts
const createDailyChart = (type, response) => {

    const chartData = extractLabelsAndData(type, response.daily);

    const ctx = $('#chart-canvas').getContext('2d');
    var myLineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: [{
                data: chartData.data,
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderColor: 'rgba(252, 163, 17, 1)',
                borderWidth: 3,
                fill: false
            }]
        },
        options: {
            legend: {
                display: false
            },
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: true
                    }
                }]
            }
        }
    });
};

const updateMap = () => {
    //Update map
    map.setView([lat, lon], 13);
}