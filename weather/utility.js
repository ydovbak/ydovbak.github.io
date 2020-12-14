//This array is used for converting number of day from Date class into string day
const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const getCardinalDirectionAndArrow = (angle) => {
    const directions = ['↑ N', '↗ NE', '→ E', '↘ SE', '↓ S', '↙ SW', '← W', '↖ NW'];
    return directions[Math.round(angle / 45) % 8];
};

const getCardinalArrow = (angle) => {
    const directions = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
    return directions[Math.round(angle / 45) % 8];
};

// this method translates the index of the tay into ordinary name
// like 1 is Monday, 2- Tuesday etc
const getNameOfDay = (day) =>  {

    // checking for todays and tomorrows day
    const today = new Date(Date.now());
    if (today.getDay() == day) {
        return "Today";
    } else if ((today.getDay()) == day) {
        return "Tomorrow";
    }
    return weekday[day];
};

const placeAutocompletePanel = () => {
    const panelEl = $('#autocomplete-panel');

    //obtaining the x and y coordinates for placing the autocomplete panel
    let coord = $('#search-city-input').getBoundingClientRect();
    panelEl.style.top = (coord.y + coord.height) + 'px';
    panelEl.style.left = coord.x + 'px';
    panelEl.style.width = coord.width + 'px';
};

const showAutocompletePanel = () => {
    const panelEl = $('#autocomplete-panel');
    panelEl.style.display = "block";
};

const hideAutocompletePanel = () => {
    const panelEl = $('#autocomplete-panel');
    panelEl.style.display = "none";
};
