import React from 'react';
import styles from './loading.module.css';

export default function Loading() {
  return (
    <div className={styles.container}>
      <div className={styles.glow}></div>
      <div className={styles.loaderWrapper}>
        <div className={styles.spinner}></div>
        <div className={styles.text}>Loading Workspace...</div>
      </div>
    </div>
  );
}
