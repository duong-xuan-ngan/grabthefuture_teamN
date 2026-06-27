import { useEffect, useState } from 'react';
import TaskListScreen from '../components/driver/TaskListScreen.jsx';
import TaskDetailScreen from '../components/driver/TaskDetailScreen.jsx';
import WeightInputScreen from '../components/driver/WeightInputScreen.jsx';
import CompletedScreen from '../components/driver/CompletedScreen.jsx';
import UnreachableScreen from '../components/driver/UnreachableScreen.jsx';
import ShiftSummaryScreen from '../components/driver/ShiftSummaryScreen.jsx';
import * as api from '../api/client.js';
import { BIN_CATEGORIES, capacityStatus } from '../lib/constants.js';

// Driver app — token-bound to a single truck. For the demo we pin one truck.
// Mock mode uses string ids ('tr-B'); the real backend seeds integer ids (1, 2).
// VITE_DRIVER_TRUCK_ID overrides; default matches the mock so mock mode is
// unaffected when no backend is configured.
const USE_MOCK =
  import.meta.env.VITE_USE_MOCK === 'true' || !import.meta.env.VITE_API_URL;
const TRUCK_ID =
  import.meta.env.VITE_DRIVER_TRUCK_ID || (USE_MOCK ? 'tr-B' : '1');

export default function DriverPage() {
  const [tab, setTab] = useState('list'); // 'list' | 'task' | 'shift'
  const [tasks, setTasks] = useState([]);
  const [truck, setTruck] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [step, setStep] = useState('detail'); // detail | weight | completed | unreachable
  const [weight, setWeight] = useState(150);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    const [list, allTrucks] = await Promise.all([
      api.listTasks(TRUCK_ID),
      api.listTrucks(),
    ]);
    setTasks(list);
    const me = allTrucks.find((t) => String(t.id) === String(TRUCK_ID));
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
    setStep('weight');
  }
  async function onMarkUnreachable() {
    await api.patchTask(activeId, { status: 'unreachable' });
    setStep('unreachable');
    await refresh();
  }
  async function onConfirmWeight() {
    await api.patchTask(activeId, {
      status: 'done',
      weight_collected_kg: weight,
    });
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
    <div className="min-h-full flex flex-col bg-white text-ink">
      {/* App header */}
      <header className="flex-shrink-0 border-b border-hairline px-5 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xs text-ink-2">
              {truck ? `${truck.name.split(' · ')[0]} · ${truck.driver}` : 'Loading…'}
            </div>
            <div className="text-lg font-semibold tracking-tightish">
              {tab === 'list' && 'Today\'s stops'}
              {tab === 'task' && 'Current task'}
              {tab === 'shift' && 'Shift summary'}
            </div>
          </div>
          {truck && (
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-ink-3">Load</div>
              <div className="text-base font-semibold num">
                {truck.current_load_kg.toLocaleString()}
                <span className="text-xs text-ink-2 font-medium">
                  /{truck.max_capacity_kg.toLocaleString()}kg
                </span>
              </div>
            </div>
          )}
        </div>
        {cap && (
          <>
            <div className="mt-2.5 h-[3px] bg-surface rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${cap.pct}%`,
                  background:
                    cap.level === 'full' ? '#B91C1C' : cap.level === 'near_full' ? '#B45309' : '#306D29',
                }}
              />
            </div>
            <div className="text-[10.5px] text-ink-2 num mt-1">
              {cap.pct}% · {(truck.max_capacity_kg - truck.current_load_kg).toLocaleString()} kg remaining
            </div>
          </>
        )}
      </header>

      {/* Body */}
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        {tab === 'list' && (
          <TaskListScreen tasks={tasks} onOpen={openTask} />
        )}
        {tab === 'task' && activeTask && step === 'detail' && (
          <TaskDetailScreen
            task={activeTask}
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
        {tab === 'task' && step === 'unreachable' && (
          <UnreachableScreen onNext={onNext} />
        )}
        {tab === 'shift' && <ShiftSummaryScreen tasks={tasks} truck={truck} />}
      </main>

      {/* Bottom tab bar */}
      <nav className="flex-shrink-0 border-t border-hairline grid grid-cols-3 bg-white pb-safe">
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
    </div>
  );
}

function TabBtn({ active, onClick, label, icon, badge }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center py-2.5 gap-0.5 relative ${
        active ? 'text-ink' : 'text-ink-2'
      }`}
    >
      <div className={active ? 'text-primary' : ''}>{icon}</div>
      <div className="text-[10.5px] font-medium">{label}</div>
      {badge ? (
        <div className="absolute top-2 right-1/2 translate-x-3.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-white text-[9.5px] font-semibold flex items-center justify-center num">
          {badge}
        </div>
      ) : null}
    </button>
  );
}
