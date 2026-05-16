import type { JSX } from 'solid-js';
import { For, Show } from 'solid-js';
import { state } from '../../state/store';

export interface LaborTask {
  key:      string;
  icon:     string;
  name:     string;
  desc:     string;
  bonus:    string;     // e.g. "+10g"
  action:   () => void;
  /** Extra condition beyond labor remaining & not already done */
  canAct?:  () => boolean;
  /** Tooltip shown when canAct is false */
  hint?:    string;
}

interface Props { tasks: LaborTask[] }

export default function LaborSection(props: Props): JSX.Element {
  const noLabor = () => state.laborUsed >= state.laborMax;

  return (
    <div class="labor-section">
      <div class="labor-section-title">⚒ Today's Labor</div>
      <div class="labor-task-list">
        <For each={props.tasks}>
          {(task) => {
            const done   = () => state.completedChores.includes(task.key);
            const ready  = () => !noLabor() && !done() && (task.canAct ? task.canAct() : true);
            const hint   = () => done()            ? 'Already done today.'
                               : noLabor()         ? 'No labor remaining.'
                               : task.hint         ? task.hint
                               : '';
            return (
              <div class={`task-row${done() ? ' task-done' : ''}`}>
                <span class="task-icon">{task.icon}</span>
                <div class="task-info">
                  <div class="task-name">{task.name}
                    <span class="task-bonus">{task.bonus}</span>
                  </div>
                  <div class="task-desc">{task.desc}</div>
                </div>
                <Show
                  when={!done()}
                  fallback={<span class="task-done-badge">✓ Done</span>}
                >
                  <button
                    class="btn btn-sm btn-teal"
                    disabled={!ready()}
                    title={hint()}
                    onClick={task.action}
                  >Do</button>
                </Show>
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
}

