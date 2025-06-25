import styles from "../page.module.css";
import CountriesGraphqlQuery from "@/components/CountriesGraphqlQuery";

export default function CountriesPage() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <CountriesGraphqlQuery />
      </main>
    </div>
  );
}
