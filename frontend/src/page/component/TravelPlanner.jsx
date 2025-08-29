import React, { useState } from "react";
import axios from "axios";

function TravelPlanner() {
  const [destination, setDestination] = useState("");
  const [days, setDays] = useState(3);
  const [budget, setBudget] = useState(500);
  const [plan, setPlan] = useState(null); // use null instead of string
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState("");

  const handlePlanTrip = async () => {
    setLoading(true);
    setError("");
    try {
      // 1. Fetch travel plan
      const planResponse = await axios.post("http://localhost:5000/api/plan-trip", {
        destination,
        days,
        budget,
      });

      // normalize response
      const planData = planResponse.data.plan || planResponse.data;
      setPlan(planData);

      // 2. Fetch weather data ☁️
      const weatherResponse = await axios.get(
        `http://localhost:5000/api/weather?city=${destination}`
      );

      setWeather(weatherResponse.data);
    } catch (err) {
      console.error(err);
      setError("❌ Failed to fetch travel plan or weather.");
      setPlan(null);
      setWeather(null);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">✈️ AI Travel Planner</h1>

      <input
        type="text"
        placeholder="Enter destination"
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
        className="border rounded p-2 w-full mb-2"
      />

      <input
        type="number"
        placeholder="Days"
        value={days}
        onChange={(e) => setDays(Number(e.target.value))}
        className="border rounded p-2 w-full mb-2"
      />

      <input
        type="number"
        placeholder="Budget ($)"
        value={budget}
        onChange={(e) => setBudget(Number(e.target.value))}
        className="border rounded p-2 w-full mb-2"
      />

      <button
        onClick={handlePlanTrip}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        {loading ? "Planning..." : "Generate Plan"}
      </button>

      {error && <p className="text-red-600 mt-3">{error}</p>}
      <br />
      {weather && (
  <div
    className="bg-gradient-to-r from-blue-100 via-blue-200 to-blue-100 
               border border-blue-300 p-5 rounded-md shadow-lg 
               text-center mb-6 w-80"
  >
    <h2 className="text-xl font-bold text-blue-900 mb-2">
      🌤 Weather in {weather.name}
    </h2>
    <p className="text-lg font-medium text-gray-800">
      {weather.weather[0].description} | 🌡 {weather.main.temp}°C
    </p>
    <p className="text-sm text-gray-700">
      💧 {weather.main.humidity}% humidity | 🌬 {weather.wind.speed} m/s
    </p>
  </div>
)}

      {plan && (
        <div className="mt-4 p-4 border rounded bg-gray-50 w-full">
          <h2 className="font-semibold mb-4">Your Travel Plan</h2>

          <p className="mb-2">
            <strong>Destination:</strong> {plan.destination}
          </p>
          <p className="mb-4">
            <strong>Days:</strong> {plan.days}
          </p>

          <div className="mb-4">
  {plan.daily_plan?.map((day) => (
    <div key={day.day} className="mb-3 border p-2 rounded">
      <h4 className="font-bold mb-1">Day {day.day}</h4>
      <ul className="list-disc pl-5">
        <li><strong>Morning:</strong> {day.plan.morning}</li>
        <li><strong>Afternoon:</strong> {day.plan.afternoon}</li>
        <li><strong>Evening:</strong> {day.plan.evening}</li>
      </ul>
    </div>
  ))}
</div>


          <h3 className="font-semibold mb-2">Budget Estimate:</h3>
          <p><strong>Total:</strong> ${plan.budget_estimate?.total}</p>
          <ul className="list-disc list-inside">
            {plan.budget_estimate?.breakdown &&
              Object.entries(plan.budget_estimate.breakdown).map(([key, value]) => (
                <li key={key}>
                  <strong>{key.replace(/_/g, " ")}:</strong> ${value}
                </li>
              ))}
          </ul>
        </div>
      )}

    </div>
  );
}

export default TravelPlanner;
