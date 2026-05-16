import type { JSX } from 'solid-js';
import type { Hero } from '../../data/types';
import { CLASS_DEFS } from '../../data/heroData';

interface HeroCardProps {
  hero: Hero;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

export default function HeroCard(props: HeroCardProps): JSX.Element {
  const def = () => CLASS_DEFS[props.hero.heroClass];
  const hpPct  = () => (props.hero.hp / props.hero.maxHp) * 100;
  const mpPct  = () => props.hero.maxMp > 0 ? (props.hero.mp / props.hero.maxMp) * 100 : 0;
  const hpClass = () => hpPct() > 60 ? 'good' : hpPct() > 25 ? 'medium' : '';

  return (
    <div
      class={`hero-card${props.selected ? ' selected' : ''}${props.hero.status === 'dead' ? ' dead' : ''}`}
      onClick={props.onClick}
    >
      <div class="hero-portrait" style={{ background: `${props.hero.portrait}22`, 'border-color': `${props.hero.portrait}55` }}>
        <span>{def().icon}</span>
        <span class="hero-portrait-level">Lv{props.hero.level}</span>
      </div>
      <div class="hero-info">
        <div class="hero-name">{props.hero.name}</div>
        <div class="hero-class-label">{def().label} · {props.hero.status}</div>
        <div class="hp-bar">
          <div class={`hp-fill ${hpClass()}`} style={{ width: `${hpPct()}%` }} />
        </div>
        <div class="bar-label">
          <span>❤️ {props.hero.hp}/{props.hero.maxHp}</span>
          {props.hero.maxMp > 0 && <span>💧 {props.hero.mp}/{props.hero.maxMp}</span>}
        </div>
        {props.hero.maxMp > 0 && (
          <div class="mp-bar">
            <div class="mp-fill" style={{ width: `${mpPct()}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}

