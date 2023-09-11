"use strict";

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");

class Workout {
    date = new Date();
    id = (Date.now() + "").slice(-10);

    constructor(coords, distance, duration) {
        this.coords = coords;
        this.distance = distance; // km
        this.duration = duration; // min
    }

    _setDescription() {
        if (this.type === "running") {
            this.description = `Running on ${this.date.getDate()} ${
                months[this.date.getMonth()]
            } at ${`${this.date.getHours()}`.padStart(
                2,
                "0"
            )}:${`${this.date.getMinutes()}`.padStart(2, "0")}`;
        } else {
            this.description = `Cycling on ${this.date.getDate()} ${
                months[this.date.getMonth()]
            } at ${`${this.date.getHours()}`.padStart(
                2,
                "0"
            )}:${`${this.date.getMinutes()}`.padStart(2, "0")}`;
        }
    }
}

class Running extends Workout {
    type = "running";

    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.#calculatePace();
        this._setDescription();
    }

    #calculatePace() {
        // min / km
        this.pace = this.duration / this.distance;
    }
}

class Cycling extends Workout {
    type = "cycling";

    constructor(coords, distance, duration, elevation) {
        super(coords, distance, duration);
        this.elevation = elevation;
        this.#calculateSpeed();
        this._setDescription();
    }

    #calculateSpeed() {
        // km / h
        this.speed = this.distance / this.duration / 60;
    }
}

class App {
    #map;
    #mapEvent;
    #workouts = [];

    constructor() {
        // Получение местоположения пользователя
        this.#getPosition();
        // Получение данных из LocalStorage
        this.#getLocalStorageData();
        // Добавление обработчкика события
        form.addEventListener("submit", this.#newWorkout.bind(this));
        inputType.addEventListener("change", this.#toggleClimbField);
        containerWorkouts.addEventListener(
            "click",
            this.#moveToWorkout.bind(this)
        );
    }

    #getPosition() {
        if (navigator.geolocation) {
            // получаем геопозицию
            navigator.geolocation.getCurrentPosition(
                this.#loadMap.bind(this),
                function () {
                    alert("Невозможно получить ваше местоположение");
                }
            );
        }
    }

    #loadMap(position) {
        const { latitude } = position.coords; // получаем ширину
        const { longitude } = position.coords; // получаем долготу
        this.#map = L.map("map").setView([latitude, longitude], 14);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; Я не поддерживаю Украину!",
        }).addTo(this.#map);

        this.#map.on("click", this.#showForm.bind(this));
		// Отображение меток из LocalStorage
		this.#workouts.forEach(workout => {
			this.#displayWorkoutMarker(workout);
		})
    }

    #showForm(e) {
        this.#mapEvent = e;
        form.classList.remove("hidden");
        inputDistance.focus();
    }

    #hideForm() {
        form.classList.add("hidden");
        if (inputType.value === "cycling") {
            inputType.value = "running";
            this.#toggleClimbField();
        }
        inputDistance.value =
            inputCadence.value =
            inputDuration.value =
            inputElevation.value =
                "";
    }

    #toggleClimbField() {
        inputElevation
            .closest(".form__row")
            .classList.toggle("form__row--hidden");
        inputCadence
            .closest(".form__row")
            .classList.toggle("form__row--hidden");
    }

    #newWorkout(e) {
        const areNumbers = (...numbers) =>
            numbers.every((num) => Number.isFinite(num));

        const areNumbersPositive = (...numbers) =>
            numbers.every((num) => num > 0);

        e.preventDefault();

        const { lat, lng } = this.#mapEvent.latlng;
        let workout;

        // Получить данные из формы
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;

        // Если тренировка является пробежкой, создать объект Running
        if (type === "running") {
            const cadence = +inputCadence.value;
            // Проверка валидности данных
            if (
                !areNumbers(distance, duration, cadence) ||
                !areNumbersPositive(distance, duration, cadence)
            )
                return alert("Введите положительное число!");

            // Создание объекта
            workout = new Running([lat, lng], distance, duration, cadence);
        }

        // Если велотренировка - создать Cycling
        if (type === "cycling") {
            const elevation = +inputElevation.value;
            if (
                !areNumbers(distance, duration, elevation) ||
                !areNumbersPositive(distance, duration)
            )
                return alert("Введите положительное число!");

            workout = new Cycling([lat, lng], distance, duration, elevation);
        }

        // Добавить новый объект в массив тренировок
        this.#workouts.push(workout);

        // Отобразить тренировку на карте
        this.#displayWorkoutMarker(workout);

        // Отобразить тренировку в списке
        this.#displayWorkoutOnSidebar(workout);

        // Спрятать форму и очистить поля ввода данных
        this.#hideForm();

        // Добавить все тренировки в локальное хранилище
        this.#addWorkoutToLocalStorage();
    }

    #displayWorkoutMarker(workout) {
        L.marker(workout.coords)
            .addTo(this.#map)
            .bindPopup(
                L.popup({
                    autoClose: false,
                    closeOnClick: false,
                    className: `${workout.type}-popup`,
                })
            )
            .setPopupContent(
                `${workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"} ${
                    workout.description
                }`
            )
            .openPopup();
    }

    #displayWorkoutOnSidebar(workout) {
        let html = `
		<li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
                workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>`;
        if (workout.type == "running") {
            html += `
			<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(2)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
		  </li>`;
        }
        if (workout.type === "cycling") {
            html += `
			<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(2)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevation}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>`;
        }

        form.insertAdjacentHTML("afterend", html);
    }

    #moveToWorkout(e) {
        const workoutElement = e.target.closest(".workout");
        if (!workoutElement) return;
        const workout = this.#workouts.find(
            (item) => item.id === workoutElement.dataset.id
        );
        this.#map.setView(workout.coords, 14, {
            animate: true,
            pan: {
                duration: 1,
            },
        });
    }

    #addWorkoutToLocalStorage() {
        localStorage.setItem("workouts", JSON.stringify(this.#workouts));
    }

    #getLocalStorageData() {
		//  Получаем данные из LocalStorage и парсим их в массив обратно
        const data = JSON.parse(localStorage.getItem("workouts"));
		// Провереям, пришло ли нам что-то
        if (!data) return;
		// Записываем полученный массив в наш массив с тренировками
        this.#workouts = data;
		// Для каждого элемента массива вызываем метод, который будет печатать его в Sidebar
        this.#workouts.forEach((workout) => {
            this.#displayWorkoutOnSidebar(workout);

        });
    }

	resetLocalStorage() {
		localStorage.removeItem('workouts');
		location.reload();
	}
}

const app = new App();
