// DriverPage — mobile task view
// Member C owns this page. Target: Chrome/Safari mobile.

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import CapacityBar from '../components/CapacityBar';
import { fetchTasks, updateTask } from '../api/client';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const HCMC_CENTER = [10.7769, 106.7009];
const POLL_MS = 30_000;

export default function DriverPage() {
  const truckId  = localStorage.getItem('wh_truck_id');
  const [tasks, setTasks]               = useState([]);
  const [activeTask, setActiveTask]     = useState(null);
  const [showWeight, setShowWeight]     = useState(false);
  const [weightKg, setWeightKg]         = useState('');
  const [truck, setTruck]               = useState(null);

  async function loadTasks() {
    const data = await fetchTasks(truckId);
    setTasks(data.tasks ?? []);
    setTruck(data.truck ?? null);
  }

  useEffect(() => {
    loadTasks();
    const id = setInterval(loadTasks, POLL_MS);
    return () => clearInterval(id);
  }, []);

  async function handleDone() {
    setShowWeight(true);
  }

  async function handleConfirmWeight() {
    await updateTask(activeTask.id, {
      status: 'done',
      weight_collected_kg: parseFloat(weightKg) || activeTask.estimated_weight_kg,
    });
    setShowWeight(false);
    setActiveTask(null);
    setWeightKg('');
    loadTasks();
  }

  async function handleUnreachable() {
    await updateTask(activeTask.id, { status: 'unreachable' });
    setActiveTask(null);
    loadTasks();
  }

  const truckPct = truck
    ? (truck.current_load_kg / truck.max_capacity_kg) * 100
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Truck capacity header */}
      {truck && (
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="text-xs text-gray-500 mb-1">{truck.name} — {truck.current_load_kg} / {truck.max_capacity_kg} kg</div>
          <CapacityBar pct={truckPct} />
        </div>
      )}

      {/* Weight input overlay */}
      {showWeight && activeTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 mx-4 w-full max-w-sm space-y-4">
            <h2 className="text-lg font-semibold">Confirm Weight Collected</h2>
            <p className="text-sm text-gray-500">{activeTask.hotspot?.waste_point?.name}</p>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Weight (kg)</label>
              <input
                type="number"
                value={weightKg}
                onChange={e => setWeightKg(e.target.value)}
                placeholder={activeTask.estimated_weight_kg}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-lg"
                min="0"
              />
              <p className="text-xs text-gray-400 mt-1">Default: {activeTask.estimated_weight_kg} kg (bin category)</p>
            </div>
            <button
              onClick={handleConfirmWeight}
              className="w-full bg-green-600 text-white font-semibold py-3 rounded-xl text-base"
            >
              ✓ Confirm
            </button>
          </div>
        </div>
      )}

      {/* Task detail */}
      {activeTask ? (
        <div className="flex flex-col flex-1">
          <div className="bg-white px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <button onClick={() => setActiveTask(null)} className="text-gray-400">← Back</button>
            <h1 className="font-semibold text-gray-800">{activeTask.hotspot?.waste_point?.name}</h1>
          </div>
          <div className="h-48 w-full">
            <MapContainer
              center={[activeTask.hotspot?.waste_point?.lat ?? 10.77, activeTask.hotspot?.waste_point?.lng ?? 106.70]}
              zoom={16}
              className="h-full w-full"
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[activeTask.hotspot?.waste_point?.lat, activeTask.hotspot?.waste_point?.lng]}>
                <Popup>{activeTask.hotspot?.waste_point?.name}</Popup>
              </Marker>
            </MapContainer>
          </div>
          <div className="p-4 space-y-2 text-sm">
            <div><span className="text-gray-500">Issue:</span> <strong>{activeTask.hotspot?.severity}</strong></div>
            <div><span className="text-gray-500">Est. weight:</span> <strong>{activeTask.estimated_weight_kg} kg</strong></div>
          </div>
          <div className="p-4 flex gap-3 mt-auto">
            <button
              onClick={handleDone}
              className="flex-1 bg-green-600 text-white font-bold py-4 rounded-xl text-lg min-h-[56px]"
            >
              ✓ Done
            </button>
            <button
              onClick={handleUnreachable}
              className="flex-1 bg-red-100 text-red-700 font-bold py-4 rounded-xl text-lg min-h-[56px]"
            >
              ✗ Unreachable
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 flex-1">
          <h1 className="text-lg font-semibold text-gray-800 mb-3">My Tasks</h1>
          {tasks.length === 0 && (
            <p className="text-gray-400 text-sm">No tasks assigned. Check back soon.</p>
          )}
          <div className="space-y-3">
            {tasks.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTask(t)}
                className="w-full bg-white border border-gray-200 rounded-xl p-4 text-left shadow-sm"
              >
                <div className="font-medium text-gray-800">{t.hotspot?.waste_point?.name}</div>
                <div className="text-xs text-gray-500 mt-1">{t.hotspot?.severity} · {t.estimated_weight_kg} kg</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
