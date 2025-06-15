import styles from "./page.module.css";
import CatFacts from "@/components/CatFacts";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <CatFacts />
      </main>
    </div>
  );
}
