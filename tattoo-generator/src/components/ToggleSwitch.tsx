import React from 'react'
import styles from './ToggleSwitch.module.css'

type ToggleSwitchProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  ariaLabel?: string
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, disabled = false, ariaLabel }) => {
  const handleClick = () => {
    if (disabled) return
    onChange(!checked)
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked ? 'true' : 'false'}
      aria-label={ariaLabel || 'Toggle slider preview'}
      className={[styles.switch, checked ? styles.on : styles.off, disabled ? styles.disabled : ''].join(' ').trim()}
      onClick={handleClick}
      disabled={disabled}
    >
      <span className={styles.knob} />
    </button>
  )
}

export default ToggleSwitch
