import styles from "../page.module.css";
import CatFacts from "@/components/CatFacts";

export default function CatFactsPage() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <CatFacts />
      </main>
    </div>
  );
}
