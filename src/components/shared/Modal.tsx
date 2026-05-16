import { type JSX, Show } from 'solid-js';
import { Portal } from 'solid-js/web';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: JSX.Element;
}

export default function Modal(props: ModalProps): JSX.Element {
  return (
    <Portal>
      <div class="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) props.onClose(); }}>
        <div class="modal-box">
          <div class="modal-header">
            <span class="modal-title">{props.title}</span>
            <button class="modal-close" onClick={props.onClose}>✕</button>
          </div>
          {props.children}
        </div>
      </div>
    </Portal>
  );
}

