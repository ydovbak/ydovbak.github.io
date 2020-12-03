"use strict";
const ApiKey = 'f4a88f380ea81884743aec0bbf45f133';
let lat;
let lon;
let mainAPIresponce;        // responce with curr and weekly weather forecast
let threeHourAPIresponse;   // responce with 3-hour breakdown for next 7 days
let tabId = 0;              // the index of day tab that was clicked
let unit = 'metric';        // measurement units of the web page         
let temp = "&deg;C";        // format of temperature output (C/F)
let distance = "m";         // format of the distance output (meters/miles)
let chartType = 'temperature';
let cities = [];
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

        // performing API calls and outputing data into UI
        console.log('Location found, fetching data...');
        updateUI(lat, lon, unit);

        // initialise leaflet maps
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
        if(citySearchName.length < 2) {
            acListEl.innerHTML = '';
            return;
        }

        // filtering 5 cities that start with same chars as user input
        const pattern = new RegExp(`${citySearchName}`, 'i');
        const filteredCities = cities.filter(city => pattern.test(city.name)).slice(0, 5);

        // remove all children that were created previously
        acListEl.innerHTML = '';


        for (let cityId = 0; cityId<filteredCities.length; cityId++) {

            // create <li> element for each city that matched the search
            const acItemEl = document.createElement('li');
            acItemEl.classList.add('list-group-item', 'list-group-item-action', 'autocomplete-item');
            acItemEl.innerHTML = `${filteredCities[cityId].name}, ${filteredCities[cityId].country}`;
            acItemEl.setAttribute("data-index", cityId)

            // appending the <li> into <ul>
            acListEl.appendChild(acItemEl);

            acItemEl.addEventListener('click', (event) => {
                // Getting the index of <li> that was clicked
                const cityIndex = parseInt( event.target.attributes['data-index'].value);
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
    // Weekly panel 
    //
    const tabs = document.querySelectorAll(".nav-link");
    for (let i = 0; i < tabs.length; i++) {
        tabs[i].addEventListener('click', (event) => {
            tabId = i;
            console.log('clicked' + i);
            fillHourlyBreakdown(threeHourAPIresponse);
        });
    };

    //
    // Charts 
    //
    $('#chart-temp').addEventListener('click', () => {
        $('#chart-dropdown').innerText = "Temperature";
        chartType = 'temperature';
        createDailyChart(chartType, mainAPIresponce);
    });

    $('#chart-hum').addEventListener('click', () => {
        $('#chart-dropdown').innerText = "Humidity";
        chartType = 'humidity';
        createDailyChart(chartType, mainAPIresponce);
    });

    $('#chart-cloud').addEventListener('click', () => {
        $('#chart-dropdown').innerText = "Cloudiness";
        chartType = 'cloudiness';
        createDailyChart(chartType, mainAPIresponce);
    });
}; //end of window.onload()

const updateUI = (lat, lon, unit) => {
    //Seting units and dropdown
    if (unit == "metric") {
        $('#dropdown').innerText = "Metric";
        temp = "&deg;C";
        distance = "m";
    } else {
        $('#dropdown').innerText = "Imperial";
        temp = "&deg;F";
        distance = "ml";
    }

    // making API calls with new parameters
    getForecast5days(lat, lon, unit, handleForecastResponseCallback);
    getOneApiCall(lat, lon, unit, handleOneCallForecastCallback);
};

const handleOneCallForecastCallback = (err, response) => {
    if (err) {
        console.log("Something happened");
    } else {
        mainAPIresponce = response;
        fillMainWeatherPanel(mainAPIresponce);
        fillWeeklyWeatherPanel(mainAPIresponce);
        createDailyChart(chartType, mainAPIresponce);
    }
};

const handleForecastResponseCallback = (err, response) => {
    if (err) {
        alert('Something happened');
    } else {
        const city = response.city;
        $('#city-name').innerText = city.name;
        console.log(response);
        fillThreeHourBreakdownPanel(response);
    }
};

const getOneApiCall = (lat, lon, unit, callback) => {
    const parts = 'minutely,hourly,alerts';
    const URL = `https://api.openweathermap.org/data/2.5/onecall?units=${unit}&lat=${lat}&lon=${lon}&exclude=${parts}&appid=${ApiKey}`;
    ajaxGetRequest(URL, callback);
};

const getForecast5days = (lat, lon, unit, callback) => {
    const URL = `https://api.openweathermap.org/data/2.5/forecast?&units=${unit}&lat=${lat}&lon=${lon}&appid=${ApiKey}`;
    ajaxGetRequest(URL, callback);
};

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
    $('#temperature').innerHTML = parseInt(currWeather.current.temp) + " " + temp;
    $('#feels-like').innerHTML = " " + parseInt(currWeather.current.feels_like) + " " + temp;
    $('#humidity').innerText = " " + currWeather.current.humidity + " %";
    $('#wind-speed').innerText = " " + currWeather.current.wind_speed + " " + distance + "/s";
    $('#wind-dir').innerText = " " + getCardinalDirectionAndArrow(currWeather.current.wind_deg);
    $('#uv-index').innerText = " " + currWeather.current.uvi;
    $('#clouds').innerText = currWeather.current.clouds + " %";
    $('#pressure').innerText = " " + (currWeather.current.pressure / 100) + " mb"; //Converting pressure from hpa to mb
    $('#weather-icon').src = `https://openweathermap.org/img/wn/${currWeather.current.weather[0].icon}@4x.png`;

    // setting visibility distance
    if (unit == "metric") {
        // visibility is given in meters in API, converting to km
        $('#visibility').innerText = " " + (parseInt(currWeather.current.visibility) / 1000) + " km";
    } else {
        $('#visibility').innerText = " " + currWeather.current.visibility + " miles";
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

const fillWeeklyWeatherPanel = (response) => {
    // next seven days forecast is giving us records of weather forecast for today AND next 7 days
    // which is 8 days in total. We want to show weekly forecast for today and next 6 days, therefore
    // using slice() metod we get rid of an extra day
    let sevenDaysWeather = response.daily.slice(0, -1);
    let html = "";

    for (let day of sevenDaysWeather) {
        // converting seconds into miliseconds and into Date object
        let date = new Date(day.dt * 1000);
        html += `<div class="col"><p>${getNameOfDay(date.getDay())}</p>
            <p>${date.getDate()}.${date.getMonth() + 1}</p>
            <p><img src="https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png"></p>
            <h3>${parseInt(day.temp.max)}${temp} <span class="text-muted">${parseInt(day.temp.min)}${temp}</span></h3>
            <p>${day.weather[0].description}</p></div>`;
    }
    $("#weekly-panel").innerHTML = html;
};



// set days of the tabs corresponding to API response data available
// datetime - is the first datetime available in the response list
// of three hour weather API call
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