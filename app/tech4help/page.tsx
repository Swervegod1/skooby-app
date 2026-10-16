import type { Metadata } from "next";
import Link from "next/link";
import styles from "./impact.module.css";

export const metadata: Metadata = {
 title: "Tech4Help | Technology & Community",
 description: "Meet Tech4Help. Explore technology donation and volunteer opportunities in Virginia Beach and Hampton Roads.",
 alternates: { canonical: "https://skooby.app/tech4help" },
 openGraph: { title: "Tech4Help — Good Tech Changes Lives", description: "Meet Tech4Help. Explore technology donation and volunteer opportunities in Virginia Beach and Hampton Roads.", url: "https://skooby.app/tech4help" },
};

const equipment = [["Computers & parts", "Laptops, desktops, Macs, mini PCs, CPUs, graphics cards, RAM, motherboards and cooling parts."], ["Phones, tablets & accessories", "Smartphones, tablets, e-readers, chargers, docking stations, keyboards, mice and webcams."], ["Storage & networking", "SSDs, hard drives, USB drives, memory cards, routers, switches, servers and NAS devices."], ["Creative & gaming equipment", "Consoles, controllers, cameras, microphones, speakers, audio interfaces and capture cards."], ["Printing, making & repair", "Printers, scanners, 3D printers, Raspberry Pi boards, Arduino kits and electronics repair tools."], ["Displays, power & accessibility", "Monitors, projectors, adapters, cables, UPS units and assistive technology."]];

export default function Tech4HelpPage() {
 return (
  <main id="main" className={`${styles.page} ${styles.skooby}`}>
   <div className={styles.wrap}>
    <nav className={styles.nav} aria-label="Community page navigation"><Link href="/">SKOOBY.APP</Link><a href="#get-involved">Get involved ↗</a></nav>
    <section className={styles.hero} aria-labelledby="impact-title">
     <div><p className={styles.eyebrow}>SKOOBY.APP / COMMUNITY / HAMPTON ROADS</p>
      <h1 id="impact-title">ACCESS COMES BEFORE<br/><span>OPPORTUNITY.</span></h1>
      <p className={styles.lead}>Understanding technology starts with access to it. Meet Tech4Help and explore ways to contribute equipment, share practical skills and help more people participate in a digital world.</p>
      <div className={styles.actions}><a className={styles.primary} href="mailto:chase@tech4help.org?subject=Tech4Help%20equipment%20inquiry">Ask about donating tech ↗</a><a className={styles.secondary} href="#equipment">Explore accepted equipment</a></div>
     </div>
     <aside className={styles.board} aria-label="Tech4Help mission"><p className={styles.eyebrow}>TECH4HELP</p><h2>Good tech.<br/>Brighter tomorrows.</h2>
      <div className={styles.step}><span>01</span><strong>Give equipment a second life.</strong></div>
      <div className={styles.step}><span>02</span><strong>Build practical skills.</strong></div>
      <div className={styles.step}><span>03</span><strong>Open new opportunities.</strong></div>
      <p>Virginia Beach, VA · Serving the Hampton Roads area.</p>
     </aside>
    </section>
    <section id="get-involved" className={styles.section}><p className={styles.eyebrow}>CHOOSE YOUR NEXT STEP</p><h2>Something to give. Someone to help.</h2>
     <div className={styles.cards}>
      <article className={styles.card}><span className={styles.eyebrow}>EQUIPMENT</span><h3>Clear a shelf. Create a possibility.</h3><p>Have unused technology or spare parts? Tell Tech4Help what you have, its condition and your location. Confirm acceptance and arrangements before dropping anything off.</p><a href="mailto:chase@tech4help.org?subject=Tech4Help%20equipment%20inquiry">Send an equipment inquiry ↗</a></article>
      <article className={styles.card}><span className={styles.eyebrow}>TIME & SKILLS</span><h3>Put what you know to work.</h3><p>Interested in repairs, computer setup, digital skills or organizing equipment? Introduce yourself and ask about current volunteer opportunities.</p><a href="mailto:chase@tech4help.org?subject=Tech4Help%20volunteer%20inquiry">Ask about volunteering ↗</a></article>
      <article className={styles.card}><span className={styles.eyebrow}>ORGANIZATIONS</span><h3>Start a community conversation.</h3><p>Businesses, schools and community groups can ask about equipment collections, skills sessions and future partnerships. Scope and availability are confirmed individually.</p><a href="mailto:chase@tech4help.org?subject=Tech4Help%20partnership%20inquiry">Discuss a partnership ↗</a></article>
     </div>
    </section>
    <section id="equipment" className={styles.section}><p className={styles.eyebrow}>EQUIPMENT & SPARE PARTS</p><h2>More than just computers.</h2><p>Working, outdated or repairable equipment may be useful. Contact Tech4Help about the items below before donating.</p>
     <ul className={styles.items}>{equipment.map(([title,body])=><li key={title}><strong>{title}</strong>{body}</li>)}</ul>
     <p className={styles.note}>Back up and erase personal information, and remove account or device-management locks where possible. Ask first about bulk items or damaged devices. Do not bring swollen or leaking batteries, exposed broken glass or contaminated equipment.</p>
    </section>
    <section className={`${styles.section} ${styles.faq}`}><p className={styles.eyebrow}>CLEAR EXPECTATIONS</p><h2>Know where your support goes.</h2>
     <details><summary>Does a purchase here include a donation?</summary><p>Purchases from SKOOBY.APP are commercial transactions. This page does not announce a purchase-linked donation campaign. Any future campaign will state its eligible products, dates, contribution amount and limits separately.</p></details>
     <details><summary>Can I get a tax receipt?</summary><p>Contact Tech4Help directly about its current status and documentation before making a contribution. This page does not promise tax deductibility. Buying a product or subscription here is not itself a charitable contribution.</p></details>
     <details><summary>Do I need to buy anything to get involved?</summary><p>No. Equipment and volunteer inquiries go directly to Tech4Help. You do not need a store purchase, paid subscription, crypto wallet or token to inquire.</p></details>
     <details><summary>Who is behind these projects?</summary><p>Chase William Stemple is the founder and director of Tech4Help and is also involved in SKOOBY.APP. Commercial orders and Tech4Help inquiries are separate. No donation payment is collected on this page.</p></details>
    </section>
    <section className={styles.contact}><h2>Start with a conversation.</h2><p>Chase William Stemple · Founder | Director, Tech4Help<br/>Virginia Beach, VA · Hampton Roads</p><div className={styles.actions}><a href="mailto:chase@tech4help.org">chase@tech4help.org</a><a href="tel:+17577050610">757-705-0610</a><a href="https://tech4help.org" rel="noopener noreferrer" target="_blank">tech4help.org ↗</a></div></section>
    <footer className={styles.footer}><span>TECH4HELP · TECH TODAY. BRIGHTER TOMORROWS.</span><Link href="/learn">Explore Skooby Learn ↗</Link></footer>
   </div>
  </main>
 );
}
