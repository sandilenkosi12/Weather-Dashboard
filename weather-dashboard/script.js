// API Configuration
const API_KEY = 'df7f184aa5cca8cb4f0f5bfd900e2233';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// DOM Elements
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const cityName = document.getElementById('cityName');
const date = document.getElementById('date');
const weatherIcon = document.getElementById('weatherIcon');
const weatherDesc = document.getElementById('weatherDesc');
const temp = document.getElementById('temp');
const humidity = document.getElementById('humidity');
const wind = document.getElementById('wind');
const pressure = document.getElementById('pressure');
const uv = document.getElementById('uv');
const forecastContainer = document.getElementById('forecast');
const recentCitiesContainer = document.getElementById('recentCities');
const weatherTip = document.getElementById('weatherTip');
const celsiusBtn = document.getElementById('celsiusBtn');
const fahrenheitBtn = document.getElementById('fahrenheitBtn');

// State
let currentTempCelsius = null;
let currentUnit = 'celsius';
let recentCities = JSON.parse(localStorage.getItem('recentCities')) || ['Johannesburg', 'Cape Town', 'Durban'];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('Weather Dashboard Initialized');
    loadRecentCities();
    getWeatherData('Johannesburg');
    updateDate();
});

// Search button click
searchBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (city) {
        getWeatherData(city);
        addToRecent(city);
    }
});

// Enter key press
cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const city = cityInput.value.trim();
        if (city) {
            getWeatherData(city);
            addToRecent(city);
        }
    }
});

// Temperature toggle
celsiusBtn.addEventListener('click', () => {
    celsiusBtn.classList.add('active');
    fahrenheitBtn.classList.remove('active');
    currentUnit = 'celsius';
    updateTemperatureDisplay();
});

fahrenheitBtn.addEventListener('click', () => {
    fahrenheitBtn.classList.add('active');
    celsiusBtn.classList.remove('active');
    currentUnit = 'fahrenheit';
    updateTemperatureDisplay();
});

// Load recent cities
function loadRecentCities() {
    recentCitiesContainer.innerHTML = '';
    recentCities.forEach(city => {
        const span = document.createElement('span');
        span.className = 'recent-city';
        span.textContent = city;
        span.addEventListener('click', () => {
            cityInput.value = city;
            getWeatherData(city);
        });
        recentCitiesContainer.appendChild(span);
    });
}

// Add city to recent
function addToRecent(city) {
    if (!recentCities.includes(city)) {
        recentCities.unshift(city);
        if (recentCities.length > 5) {
            recentCities.pop();
        }
        localStorage.setItem('recentCities', JSON.stringify(recentCities));
        loadRecentCities();
    }
}

// Update date
function updateDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    date.textContent = now.toLocaleDateString('en-US', options);
}

// Get weather data
async function getWeatherData(city) {
    try {
        showLoading();
        
        console.log('Fetching weather for:', city);
        
        // Current weather
        const currentResponse = await fetch(
            `${BASE_URL}/weather?q=${city}&appid=${API_KEY}&units=metric`
        );
        
        console.log('Current weather response status:', currentResponse.status);
        
        if (!currentResponse.ok) {
            if (currentResponse.status === 401) {
                throw new Error('Invalid API key. Please check your OpenWeatherMap API key.');
            } else if (currentResponse.status === 404) {
                throw new Error(`City "${city}" not found. Please check the spelling.`);
            } else {
                throw new Error(`Error: ${currentResponse.status}`);
            }
        }
        
        const currentData = await currentResponse.json();
        console.log('Current weather data:', currentData);
        
        // Forecast
        const forecastResponse = await fetch(
            `${BASE_URL}/forecast?q=${city}&appid=${API_KEY}&units=metric`
        );
        
        if (!forecastResponse.ok) {
            throw new Error('Unable to fetch forecast data.');
        }
        
        const forecastData = await forecastResponse.json();
        console.log('Forecast data received');
        
        // UV Index (optional - might not work without paid plan)
        let uvData = { value: 'N/A' };
        try {
            const uvResponse = await fetch(
                `${BASE_URL}/uvi?lat=${currentData.coord.lat}&lon=${currentData.coord.lon}&appid=${API_KEY}`
            );
            if (uvResponse.ok) {
                uvData = await uvResponse.json();
            }
        } catch (e) {
            console.log('UV data not available');
        }
        
        displayCurrentWeather(currentData, uvData);
        displayForecast(forecastData);
        updateWeatherTip(currentData);
        
        cityName.textContent = `${currentData.name}, ${currentData.sys.country}`;
        cityInput.value = currentData.name;
        currentTempCelsius = currentData.main.temp;
        
    } catch (error) {
        console.error('Error:', error);
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Display current weather
function displayCurrentWeather(data, uvData) {
    // Weather icon
    const iconCode = data.weather[0].icon;
    weatherIcon.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    weatherIcon.alt = data.weather[0].description;
    weatherDesc.textContent = data.weather[0].description;
    
    // Temperature
    currentTempCelsius = data.main.temp;
    updateTemperatureDisplay();
    
    // Details
    humidity.innerHTML = `${data.main.humidity}%`;
    wind.innerHTML = `${data.wind.speed} m/s`;
    pressure.innerHTML = `${data.main.pressure} hPa`;
    uv.innerHTML = uvData && uvData.value ? uvData.value.toFixed(1) : 'N/A';
}

// Display forecast
function displayForecast(data) {
    forecastContainer.innerHTML = '';
    
    // Get one forecast per day (around noon)
    const dailyForecasts = [];
    const seenDates = new Set();
    
    data.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const day = date.toDateString();
        
        // Take forecast around noon (11am-2pm)
        if (!seenDates.has(day) && date.getHours() >= 11 && date.getHours() <= 14) {
            seenDates.add(day);
            dailyForecasts.push(item);
        }
    });
    
    // Limit to 5 days
    const fiveDayForecast = dailyForecasts.slice(0, 5);
    
    if (fiveDayForecast.length === 0) {
        forecastContainer.innerHTML = '<p>Forecast data unavailable</p>';
        return;
    }
    
    fiveDayForecast.forEach(forecast => {
        const date = new Date(forecast.dt * 1000);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        
        const card = document.createElement('div');
        card.className = 'forecast-card';
        
        card.innerHTML = `
            <div class="forecast-day">${dayName}</div>
            <img class="forecast-icon" src="https://openweathermap.org/img/wn/${forecast.weather[0].icon}.png" alt="${forecast.weather[0].description}">
            <div class="forecast-temp">
                <span class="forecast-max">${Math.round(forecast.main.temp_max)}°</span>
                <span class="forecast-min">${Math.round(forecast.main.temp_min)}°</span>
            </div>
            <div class="forecast-desc">${forecast.weather[0].main}</div>
        `;
        
        forecastContainer.appendChild(card);
    });
}

// Update temperature display
function updateTemperatureDisplay() {
    if (currentTempCelsius !== null) {
        if (currentUnit === 'celsius') {
            temp.textContent = Math.round(currentTempCelsius);
        } else {
            const fahrenheit = (currentTempCelsius * 9/5) + 32;
            temp.textContent = Math.round(fahrenheit);
        }
    }
}

// Update weather tips
function updateWeatherTip(data) {
    const temp = data.main.temp;
    const weather = data.weather[0].main;
    const humidity = data.main.humidity;
    
    if (temp > 30) {
        weatherTip.textContent = "☀️ It's hot! Stay hydrated and wear sunscreen.";
    } else if (temp < 10) {
        weatherTip.textContent = "❄️ It's cold! Bundle up and stay warm.";
    } else if (weather.includes('Rain')) {
        weatherTip.textContent = "☔ Don't forget your umbrella today!";
    } else if (humidity > 80) {
        weatherTip.textContent = "💧 High humidity today. Stay cool and comfortable.";
    } else if (weather.includes('Cloud')) {
        weatherTip.textContent = "☁️ Partly cloudy. A nice day to be outside!";
    } else {
        weatherTip.textContent = "🌤️ Perfect weather for outdoor activities!";
    }
}

// Show loading
function showLoading() {
    const loader = document.createElement('div');
    loader.className = 'loading';
    loader.id = 'loading-spinner';
    loader.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading weather data...';
    
    hideLoading();
    
    const container = document.querySelector('.weather-container');
    if (container) {
        container.insertBefore(loader, container.firstChild);
    }
}

// Hide loading
function hideLoading() {
    const existingLoader = document.getElementById('loading-spinner');
    if (existingLoader) {
        existingLoader.remove();
    }
}

// Show error
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    
    const container = document.querySelector('.weather-container');
    const existingError = document.querySelector('.error-message');
    
    if (existingError) {
        existingError.remove();
    }
    
    if (container) {
        container.insertBefore(errorDiv, container.firstChild);
    }
    
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 5000);
}