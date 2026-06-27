import { useEffect, useState } from 'react';
import PhoneFrame from '../components/shared/PhoneFrame.jsx';
import TaskListScreen from '../components/driver/TaskListScreen.jsx';
import TaskDetailScreen from '../components/driver/TaskDetailScreen.jsx';
import WeightInputScreen from '../components/driver/WeightInputScreen.jsx';
import CompletedScreen from '../components/driver/CompletedScreen.jsx';
import UnreachableScreen from '../components/driver/UnreachableScreen.jsx';
import ShiftSummaryScreen from '../components/driver/ShiftSummaryScreen.jsx';
import * as api from '../api/client.js';
import { capacityStatus } from '../lib/constants.js';

const USE_MOCK_CHECK =
  import.meta.env.VITE_USE_MOCK === 'true' || !import.meta.env.VITE_API_URL;

const getTruckId = () => {
  const mockMode = import.meta.env.VITE_USE_MOCK === 'true' || !import.meta.env.VITE_API_URL;
  if (mockMode) return import.meta.env.VITE_DRIVER_TRUCK_ID || 'tr-B';
  return localStorage.getItem('wh_truck_id') || import.meta.env.VITE_DRIVER_TRUCK_ID || '1';
};

export default function DriverPage({ onLogout }) {
  const [tab, setTab] = useState('list');
  const [tasks, setTasks] = useState([]);
  const [truck, setTruck] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [step, setStep] = useState('detail');
  const [weight, setWeight] = useState(150);
  const [shift, setShift] = useState(null);

  useEffect(() => { refresh(); }, []);

  async function refresh() {
    const truckId = getTruckId();
    const [list, allTrucks, shiftData] = await Promise.all([
      api.listTasks(truckId),
      api.listTrucks(),
      api.getShiftSummary(truckId),
    ]);
    setTasks(list);
    setShift(shiftData);
    const me = allTrucks.find((t) => String(t.id) === String(truckId));
    setTruck(me);
    const active = list.find((t) => t.status === 'active');
    if (active && !activeId) {
      setActiveId(active.id);
      setWeight(active.estimated_weight_kg);
    }
  }

  function openTask(taskId) {
    const t = tasks.find((x) => x.id === taskId);
    if (!t) return;
    setActiveId(taskId);
    setWeight(t.estimated_weight_kg);
    setStep('detail');
    setTab('task');
  }

  async function onMarkDone() {
    if (activeTask) {
      setWeight(activeTask.estimated_weight_kg || 0);
    }
    setStep('weight');
  }
  async function onMarkUnreachable() {
    // Snap truck to this task's location so next ETA is computed from here
    const t = tasks.find((x) => x.id === activeId);
    const truckId = getTruckId();
    if (!USE_MOCK_CHECK && t?.lat != null) {
      await api.updateTruckLocation(truckId, t.lat, t.lng).catch(() => {});
    }
    await api.patchTask(activeId, { status: 'unreachable' });
    setStep('unreachable');
    await refresh();
  }
  async function onConfirmWeight() {
    // Snap truck position to the just-completed waste point so the next task
    // gets accurate distance/ETA calculations from backend
    const t = tasks.find((x) => x.id === activeId);
    const truckId = getTruckId();
    if (!USE_MOCK_CHECK && t?.lat != null) {
      await api.updateTruckLocation(truckId, t.lat, t.lng).catch(() => {});
    }
    await api.patchTask(activeId, { status: 'done', weight_collected_kg: weight });
    setStep('completed');
    await refresh();
  }
  async function onNext() {
    const next = tasks.find((t) => t.status === 'pending');
    if (next) {
      setActiveId(next.id);
      setWeight(next.estimated_weight_kg);
      setStep('detail');
      setTab('task');
    } else {
      setTab('list');
    }
  }

  const activeTask = tasks.find((t) => t.id === activeId);
  const cap = truck ? capacityStatus(truck.current_load_kg, truck.max_capacity_kg) : null;

  return (
    <PhoneFrame>
      {/* App header */}
      <header className="flex-shrink-0 px-5 pt-3 pb-3" style={{ background: '#00212F' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px]" style={{ color: '#B0C4CC' }}>
              {truck ? `${truck.name.split(' · ')[0]} · ${truck.driver}` : 'Loading…'}
            </div>
            <div className="text-[18px] font-bold tracking-tightish text-white leading-tight">
              {tab === 'list' && "Today's stops"}
              {tab === 'task' && 'Current task'}
              {tab === 'shift' && 'Shift summary'}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {truck && (
              <div className="text-right">
                <div className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: '#B0C4CC' }}>Load</div>
                <div className="text-[15px] font-bold num text-white leading-tight">
                  {truck.current_load_kg.toLocaleString()}
                  <span className="text-[11px] font-medium" style={{ color: '#B0C4CC' }}>
                    /{truck.max_capacity_kg.toLocaleString()}kg
                  </span>
                </div>
              </div>
            )}
            {onLogout && (
              <button
                onClick={onLogout}
                className="text-[10px] underline underline-offset-2 transition-colors"
                style={{ color: '#B0C4CC' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'white'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#B0C4CC'; }}
              >
                Log out
              </button>
            )}
          </div>
        </div>
        {cap && (
          <>
            <div className="mt-2 h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${cap.pct}%`,
                  background: cap.level === 'full' ? '#DC2626' : cap.level === 'near_full' ? '#D97706' : '#00B14F',
                }}
              />
            </div>
            <div className="text-[10px] num mt-0.5" style={{ color: '#B0C4CC' }}>
              {cap.pct}% · {(truck.max_capacity_kg - truck.current_load_kg).toLocaleString()} kg remaining
            </div>
          </>
        )}
      </header>

      {/* Scrollable body */}
      <main className="flex-1 overflow-y-auto scrollbar-thin bg-white">
        {tab === 'list' && <TaskListScreen tasks={tasks} onOpen={openTask} />}
        {tab === 'task' && activeTask && step === 'detail' && (
          <TaskDetailScreen
            task={activeTask}
            tasks={tasks}
            truck={truck}
            onDone={onMarkDone}
            onUnreachable={onMarkUnreachable}
            onBack={() => setTab('list')}
          />
        )}
        {tab === 'task' && step === 'weight' && (
          <WeightInputScreen
            task={activeTask}
            weight={weight}
            setWeight={setWeight}
            onConfirm={onConfirmWeight}
            onCancel={() => setStep('detail')}
          />
        )}
        {tab === 'task' && step === 'completed' && (
          <CompletedScreen
            weight={weight}
            nextTask={tasks.find((t) => t.status === 'pending' || t.status === 'active')}
            onNext={onNext}
          />
        )}
        {tab === 'task' && step === 'unreachable' && <UnreachableScreen onNext={onNext} />}
        {tab === 'shift' && <ShiftSummaryScreen shift={shift} truck={truck} />}
      </main>

      {/* Bottom tab bar */}
      <nav className="flex-shrink-0 border-t border-hairline grid grid-cols-3 bg-white">
        <TabBtn
          active={tab === 'list'}
          onClick={() => setTab('list')}
          label="Stops"
          badge={tasks.filter((t) => t.status === 'pending' || t.status === 'active').length}
          icon={
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          }
        />
        <TabBtn
          active={tab === 'task'}
          onClick={() => activeTask && setTab('task')}
          label="Current"
          icon={
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M10 2 L17 6 V14 L10 18 L3 14 V6 Z" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="10" cy="10" r="2" fill="currentColor" />
            </svg>
          }
        />
        <TabBtn
          active={tab === 'shift'}
          onClick={() => setTab('shift')}
          label="Shift"
          icon={
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" />
              <path d="M10 6v4l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          }
        />
      </nav>
    </PhoneFrame>
  );
}

function TabBtn({ active, onClick, label, icon, badge }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center py-2.5 gap-0.5 relative transition-colors duration-200 ${
        active ? 'text-ink' : 'text-ink-2 hover:text-ink'
      }`}
    >
      <div style={active ? { color: '#00B14F' } : {}}>{icon}</div>
      <div className={`text-[10px] font-semibold ${active ? 'text-ink' : ''}`}>{label}</div>
      {badge ? (
        <div
          className="absolute top-1.5 right-1/2 translate-x-4 min-w-[16px] h-4 px-1 rounded-pill text-white text-[9px] font-bold flex items-center justify-center num"
          style={{ background: '#00B14F' }}
        >
          {badge}
        </div>
      ) : null}
    </button>
  );
}
