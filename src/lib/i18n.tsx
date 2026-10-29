import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { hasLegacyData, resolvePref } from "./prefs";

export const LANGS = ["en", "cs"] as const;
export type Lang = (typeof LANGS)[number];
const isLang = (v: unknown): v is Lang => LANGS.includes(v as Lang);
const STORAGE_KEY = "finbuddy.lang";

/** English source text (with {placeholders}) → Czech. Missing keys fall back to English. */
const CS: Record<string, string> = {
  // Homepage
  Home: "Domů",
  "Your money, in one picture": "Vaše peníze v jednom obrazu",
  "See where your money is heading.": "Podívejte se, kam vaše peníze směřují.",
  "Money Kalkulačka is a set of quick, private calculators. Each tab answers one question — together they build your personal dashboard. Everything stays in your browser.":
    "Money Kalkulačka je sada rychlých a soukromých kalkulaček. Každá záložka odpoví na jednu otázku — dohromady sestaví váš osobní přehled. Vše zůstává ve vašem prohlížeči.",
  "Start with Invest": "Začít investicemi",
  "Jump to Dashboard": "Přejít na přehled",
  "Ideal journey": "Ideální postup",
  "See how monthly contributions compound over time — and what they're worth in today's money.":
    "Podívejte se, jak měsíční vklady v čase rostou — a kolik mají hodnotu v dnešních cenách.",
  "Compare your current rate against a what-if rate and see what it really costs.":
    "Porovnejte současnou sazbu s hypotetickou a zjistěte, kolik vás to skutečně stojí.",
  "Answer a few quick questions and find out when you can realistically stop working.":
    "Odpovězte na pár rychlých otázek a zjistěte, kdy můžete reálně přestat pracovat.",
  "Your numbers carry across tabs and come together on the":
    "Vaše čísla se přenášejí mezi záložkami a spojují se v záložce",
  // Two-pot plan
  "How much do you invest each month?": "Kolik měsíčně investujete?",
  "Regular contributions to funds, ETFs or a pension — whatever you're actually managing now.":
    "Pravidelné příspěvky do fondů, ETF nebo na penzi — kolik skutečně zvládáte teď.",
  "Only count what will continue until your target age.":
    "Počítejte jen s tím, co bude pokračovat až do cílového věku.",
  "Global index funds have historically returned around 7–8% a year before inflation.":
    "Globální indexové fondy historicky vynášely zhruba 7–8 % ročně před inflací.",
  "How much do you put into savings accounts each month?": "Kolik měsíčně dáváte na spořicí účet?",
  "Money that goes into a savings account or term deposit rather than the market.":
    "Peníze, které posíláte na spořicí účet nebo termínovaný vklad, ne na trh.",
  "Leave out what stays in your everyday current account.":
    "Nezapočítávejte, co zůstává na běžném účtu.",
  "Expected interest rate": "Očekávaná úroková sazba",
  "Savings accounts usually pay close to the central bank rate — often around 2–4%.":
    "Spořicí účty obvykle úročí blízko sazby centrální banky — často kolem 2–4 %.",
  "{a} a month invested at {p} + {b} saved at {q}, in today's money":
    "{a} měsíčně investováno při {p} + {b} spořeno při {q}, v dnešních cenách",
  "Moves your investment return. The one lever you don't control.":
    "Mění výnos investic. Jediná páka, kterou nemáte pod kontrolou.",
  "Anything extra goes into your investments.": "Navýšení jde do investic.",
  "Investment return": "Výnos investic",
  "Savings interest rate": "Úrok ze spoření",
  "Invested monthly": "Měsíčně investováno",
  "Saved monthly": "Měsíčně spořeno",
  "Monthly investing": "Měsíční investice",
  "Monthly savings": "Měsíční spoření",
  Savings: "Spoření",
  "Plan — investments": "Plán — investice",
  "Plan — savings": "Plán — spoření",
  // Retirement milestones + home
  "{n} — mortgage cleared too": "{n} — splacená i hypotéka",
  "Mortgage left": "Zbývá na hypotéce",
  "Your number + mortgage left": "Cílová částka + zbytek hypotéky",
  "You'd still owe {d} on the mortgage at {age}. Keep going until {age2} to clear it.":
    "V {age} letech byste na hypotéce stále dlužili {d}. Vydržte do {age2} a splatíte i ji.",
  "You'd still owe {d} on the mortgage at {age}.": "V {age} letech byste na hypotéce stále dlužili {d}.",
  "Property value (optional)": "Hodnota nemovitosti (nepovinné)",
  "What your home would sell for today. Counts towards your net worth on the Dashboard — never towards your retirement money.":
    "Za kolik byste nemovitost dnes prodali. Započítá se do čistého jmění v Přehledu — nikdy do peněz na rentu.",
  "Include price growth": "Započítat růst cen",
  "Growth above inflation": "Růst nad inflaci",
  "On top of inflation — everything here is in today's money. 1% means the home gains 1% a year more than prices in general.":
    "Nad rámec inflace — vše je v dnešních cenách. 1 % znamená, že nemovitost zdražuje o 1 % ročně rychleji než ceny obecně.",
  "Your number": "Cílová částka",
  "Home {h} · Investments {a} · Savings {b} · Mortgage −{d}":
    "Bydlení {h} · Investice {a} · Spoření {b} · Hypotéka −{d}",
  "Excluding your home": "Bez nemovitosti",
  "Add your home's value →": "Doplnit hodnotu nemovitosti →",
  "Home ownership": "Vlastnictví bydlení",
  "{p} yours": "{p} vaše",
  "No mortgage": "Bez hypotéky",
  "The payment doesn't pay the loan off": "Splátka úvěr nesplatí",
  "{years} to go": "Zbývá {years}",
  "At {age}: net worth {v}. Clear the mortgage and the home is fully yours.":
    "V {age} letech: čisté jmění {v}. Splaťte hypotéku a bydlení je celé vaše.",
  "At {age}: net worth {v}, enough to clear the mortgage too.":
    "V {age} letech: čisté jmění {v}, dost i na splacení hypotéky.",
  "From {a} · debt-free from {b}": "Od {a} · bez dluhů od {b}",
  "Mortgage-free at {age}": "Bez hypotéky v {age}",
  "Mortgage-free in {years}": "Bez hypotéky za {years}",
  "On this path your pot doesn't reach your number before 90.":
    "Touto cestou cílové částky do 90 let nedosáhnete.",
  "From {a} you could live on {v} a month, with {d} still owed on the mortgage. Keep going until {b} to clear it.":
    "Od {a} let byste mohli žít z {v} měsíčně, na hypotéce by ale zbývalo {d}. Vydržte do {b} a splatíte i ji.",
  "From {a} you could live on {v} a month, with {d} still owed on the mortgage.":
    "Od {a} let byste mohli žít z {v} měsíčně, na hypotéce by ale zbývalo {d}.",
  "From {a} you could live on {v} a month.": "Od {a} let byste mohli žít z {v} měsíčně.",
  "Your pot": "Vaše portfolio",
  "At {age}: net worth {v}, with {d} still owed on the mortgage.":
    "V {age} letech: čisté jmění {v}, na hypotéce zbývá {d}.",
  "At {age}: net worth {v}, home fully yours.": "V {age} letech: čisté jmění {v}, bydlení je celé vaše.",
  "At {age}: net worth {v}, mortgage paid off.": "V {age} letech: čisté jmění {v}, hypotéka splacena.",
  "At {age}: net worth {v}.": "V {age} letech: čisté jmění {v}.",
  "Answer the plan questions to see when you can stop working — and when the mortgage is cleared too.":
    "Zodpovězte otázky plánu a uvidíte, kdy můžete přestat pracovat — a kdy budete mít splacenou i hypotéku.",
  "Property value": "Hodnota nemovitosti",
  "Price growth above inflation": "Růst cen nad inflaci",
  Off: "Vypnuto",
  "Answer the plan questions →": "Zodpovědět otázky plánu →",
  "Made with Money Kalkulačka · {date}": "Vytvořeno v Money Kalkulačka · {date}",
  "Term": "Doba splácení",
  "Loan amount": "Výše úvěru",
  "The details": "Podrobnosti",
  "Invested {a} · Savings {b}": "Investice {a} · Spoření {b}",
  "Same period as your investments: {years}.": "Stejné období jako investice: {years}.",
  "Interest rate": "Úroková sazba",
  "Monthly deposit": "Měsíční vklad",
  "Add money you keep in a savings account. It grows alongside your investments over the same period.": "Přidejte peníze, které držíte na spořicím účtu. Rostou spolu s investicemi po stejnou dobu.",
  "Savings account": "Spořicí účet",
  "Investments": "Investice",
  "In savings today": "Na spoření dnes",
  "Invested today": "Investováno dnes",
  "Leave out your everyday current account. Together with your investments this is your starting pot.": "Nezahrnujte běžný účet. Spolu s investicemi je to váš počáteční kapitál.",
  "Cash in savings or term deposits that counts towards your future.": "Hotovost na spořicích účtech nebo termínovaných vkladech určená pro budoucnost.",
  "How much do you have in savings accounts today?": "Kolik máte dnes na spořicích účtech?",
  "Use today's value. Avoid counting your home unless you plan to sell it.": "Použijte dnešní hodnotu. Nepočítejte bydlení, pokud ho neplánujete prodat.",
  "Funds, shares, ETFs, pension pots — money that's in the market.": "Fondy, akcie, ETF, penzijní spoření — peníze na trhu.",
  "How much do you have invested today?": "Kolik máte dnes investováno?",
  // Shell
  Currency: "Měna",
  Language: "Jazyk",
  Invest: "Investice",
  Mortgage: "Hypotéka",
  Plan: "Plán",
  Dashboard: "Přehled",
  Soon: "Brzy",
  "Copy link": "Kopírovat odkaz",
  Copied: "Zkopírováno",
  // Shared
  years: "let",
  year: "rok",
  Year: "Rok",
  "Year {n}": "Rok {n}",
  "Year by year": "Rok po roce",
  Growth: "Zhodnocení",
  "Money you put in": "Vaše vklady",
  Contributed: "Vloženo",
  Total: "Celkem",
  "Total contributed": "Vloženo celkem",
  Balance: "Zůstatek",
  "Expected annual return": "Očekávaný roční výnos",
  Inflation: "Inflace",
  // Invest
  "Initial amount": "Počáteční vklad",
  "Monthly contribution": "Měsíční příspěvek",
  "Investment period": "Investiční horizont",
  "Show in today's money": "Zobrazit v dnešních cenách",
  "Inflation rate": "Míra inflace",
  "Investment projection": "Projekce investice",
  "{years} at {rate} a year, compounded monthly.": "{years} při {rate} ročně, s měsíčním úročením.",
  "Set an investment period of at least one year to see a projection.":
    "Nastavte investiční horizont alespoň na jeden rok, abyste viděli projekci.",
  "Final value": "Konečná hodnota",
  "Total growth": "Celkové zhodnocení",
  "{p}% of the final value": "{p} % konečné hodnoty",
  "In today's money": "V dnešních cenách",
  "At {p} inflation": "Při inflaci {p}",
  "Growth over time": "Vývoj v čase",
  "What it pays you": "Pasivní příjem",
  "Once the {years} are up, this is what you could take out each year without touching the rest.":
    "Po uplynutí {years} si můžete každý rok vybírat tuto částku, aniž byste sáhli na zbytek.",
  "Invested amount": "Investovaná částka",
  "Withdrawal rate": "Míra výběru",
  "Per month": "Měsíčně",
  "Per year": "Ročně",
  "{p} a year, split over 12 months": "{p} ročně, rozděleno do 12 měsíců",
  "{v} in today's money": "{v} v dnešních cenách",
  "{v} stays invested": "{v} zůstává investováno",
  "Assumes the pot keeps earning at least the rate you take out, so the balance holds steady. Take out more than it earns and it will shrink over time.":
    "Předpokládá, že portfolio vydělává alespoň tolik, kolik vybíráte, takže zůstatek zůstává stejný. Pokud vyberete víc, než vydělá, bude se postupně zmenšovat.",
  // Mortgage
  "Solve for": "Dopočítat",
  "Monthly payment": "Měsíční splátka",
  "Remaining term": "Zbývající doba splácení",
  'Enter what you know. If the payment we calculate doesn\'t match your real one, switch to "Remaining term" and enter your actual payment instead.':
    "Zadejte, co víte. Pokud vypočtená splátka neodpovídá té skutečné, přepněte na „Zbývající doba splácení“ a zadejte svou skutečnou splátku.",
  "Remaining principal": "Zbývající jistina",
  "Current interest rate": "Aktuální úroková sazba",
  "Current monthly payment": "Aktuální měsíční splátka",
  "Compare another rate": "Porovnat jinou sazbu",
  "Compare another interest rate": "Porovnat jinou úrokovou sazbu",
  "New interest rate": "Nová úroková sazba",
  "Extra one-time payment": "Mimořádná jednorázová splátka",
  "Extra payment amount": "Výše mimořádné splátky",
  "Paid in year": "Zaplaceno v roce",
  "Starting in year": "Od roku",
  "Repeat every year": "Opakovat každý rok",
  "A payment of {v} every year from year {y}, keeping the same monthly payment.":
    "Splátka {v} každý rok od roku {y}, se stejnou měsíční splátkou.",
  "Rate change impact": "Dopad změny sazby",
  "{v} left": "Zbývá {v}",
  " over {years}": " na {years}",
  "That payment doesn't cover the monthly interest — the balance would never go down.":
    "Tato splátka nepokryje ani měsíční úrok — dluh by se nikdy nesnižoval.",
  "Enter a remaining term and principal to compare rates.":
    "Zadejte zbývající dobu splácení a jistinu pro porovnání sazeb.",
  "Current vs what-if": "Nyní vs. scénář",
  "Now · {p}": "Nyní · {p}",
  "What-if · {p}": "Scénář · {p}",
  "Total interest": "Úroky celkem",
  "Total paid": "Zaplaceno celkem",
  "Assumes the same remaining term — the monthly payment absorbs the rate change.":
    "Předpokládá stejnou zbývající dobu — změnu sazby promítne měsíční splátka.",
  "Your mortgage": "Vaše hypotéka",
  "Payments over time": "Splátky v čase",
  Principal: "Jistina",
  Interest: "Úrok",
  "Impact of the extra payment": "Dopad mimořádné splátky",
  "Interest saved": "Ušetřeno na úrocích",
  "Paid off earlier by": "Splaceno dříve o",
  "New total interest": "Nové úroky celkem",
  "A one-time payment of {v} in year {y}, keeping the same monthly payment.":
    "Jednorázová splátka {v} v roce {y}, se stejnou měsíční splátkou.",
  "Remaining balance over time": "Zbývající dluh v čase",
  Now: "Nyní",
  "What-if": "Scénář",
  Current: "Nyní",
  "Total interest, compared": "Úroky celkem — porovnání",
  "Interest paid": "Zaplacené úroky",
  "Principal paid": "Splacená jistina",
  "Remaining balance": "Zbývající dluh",
  "{y}y {m}m": "{y} r. {m} m.",
  "{m}m": "{m} m.",
  // Plan questionnaire
  "How old are you?": "Kolik je vám let?",
  "Your current age sets how long your money has to grow.":
    "Váš současný věk určuje, jak dlouho mohou peníze růst.",
  "Use your age today, rounded to the nearest whole year.":
    "Zadejte svůj dnešní věk, zaokrouhlený na celé roky.",
  "At what age would you like to stop working?": "V kolika letech byste chtěli přestat pracovat?",
  "Aiming early is fine — that's the point of working it out.":
    "Klidně miřte brzy — právě proto si to propočítáváme.",
  "This is your target, not a commitment. You can test other ages in your results.":
    "Je to váš cíl, ne závazek. Jiný věk si můžete vyzkoušet ve výsledcích.",
  "How much would you need each month to live on?": "Kolik byste měsíčně potřebovali na život?",
  "In today's money — what your life costs now is usually a good guide.":
    "V dnešních cenách — dobrým vodítkem je, kolik vás život stojí teď.",
  "Include regular living costs and room for the lifestyle you want. Leave out savings contributions.":
    "Zahrňte běžné životní náklady a rezervu na životní styl, jaký chcete. Spoření nezapočítávejte.",
  "How much do you have saved or invested today?": "Kolik máte dnes naspořeno nebo investováno?",
  "Everything you'd count towards this: investments, savings, pension pots.":
    "Vše, co byste sem započítali: investice, úspory, penzijní spoření.",
  "Use money intended for your future. Avoid counting your home unless you plan to sell it.":
    "Počítejte peníze určené pro vaši budoucnost. Vlastní bydlení nezapočítávejte, pokud ho neplánujete prodat.",
  "How much do you put aside each month?": "Kolik měsíčně odkládáte stranou?",
  "Whatever you're actually managing right now, not the aspiration.":
    "Kolik skutečně odkládáte teď, ne kolik byste chtěli.",
  "Include regular investing and pension contributions that will continue until your target age.":
    "Zahrňte pravidelné investice a penzijní příspěvky, které budou pokračovat až do cílového věku.",
  "Enter a number to continue.": "Pro pokračování zadejte číslo.",
  "Between {min} and {max}, please.": "Zadejte prosím hodnotu mezi {min} a {max}.",
  "It has to be above your current age — otherwise you'd already be there.":
    "Musí být vyšší než váš současný věk — jinak byste už v cíli byli.",
  Back: "Zpět",
  "See my plan": "Zobrazit můj plán",
  Continue: "Pokračovat",
  "Skip for now": "Zatím přeskočit",
  // Plan results
  Closed: "Uzavřeno",
  "Now: {v}": "Nyní: {v}",
  "This one can't close the gap on its own.": "Tato páka sama mezeru neuzavře.",
  "This alone closes the gap.": "Tohle samo mezeru uzavře.",
  "What this alone would have to be": "Kolik by to samo muselo být",
  "You could stop working now.": "Pracovat byste mohli přestat už teď.",
  "On this path, you don't reach your number.": "Touto cestou cílové částky nedosáhnete.",
  "You can stop working at {age} — {years} early.":
    "Pracovat můžete přestat v {age} letech — o {years} dříve.",
  "That's ahead of your target of {stop}. Keep going until {stop} and you'd have about {v} more than your number.":
    "To je dříve než váš cíl {stop} let. Pokud vydržíte do {stop}, budete mít zhruba o {v} víc, než potřebujete.",
  "You're on track to stop working at {stop}.": "Jste na dobré cestě přestat pracovat v {stop} letech.",
  "At this rate, you can stop working at {age}.": "Tímto tempem můžete přestat pracovat v {age} letech.",
  "{years} later than your target of {stop}. At {stop} you'd have about {v} — around {gap} short.":
    "O {years} později než váš cíl {stop} let. V {stop} letech byste měli zhruba {v} — chybělo by asi {gap}.",
  "Save as PDF": "Uložit jako PDF",
  "Edit answers": "Upravit odpovědi",
  "Your target": "Cílová částka pro rentu",
  "{p} a year of it covers your yearly spending of {v} without touching the pot":
    "{p} ročně z ní pokryje vaše roční výdaje {v}, aniž byste sáhli na jistinu",
  "Projected at {stop}": "Odhad ve {stop} letech",
  "{v} a month at {p}, in today's money": "{v} měsíčně při {p}, v dnešních cenách",
  "The gap": "Mezera",
  Covered: "Pokryto",
  "You're ahead of your number": "Máte víc, než potřebujete",
  "What the projection is missing": "Kolik projekci chybí",
  "Getting there": "Cesta k cíli",
  "Four ways to close the gap": "Čtyři způsoby, jak mezeru uzavřít",
  "Reset levers": "Obnovit páky",
  "Save more each month": "Spořit více",
  "Work a bit longer": "Pracovat déle",
  "years old": "let",
  "Live on less": "Snížit výdaje",
  "{v}/mo": "{v}/měs.",
  "Higher returns": "Vyšší výnosy",
  "The one lever you don't control.": "Jediná páka, kterou nemáte pod kontrolou.",
  Assumptions: "Předpoklady",
  "All figures are in today's money.": "Všechny částky jsou v dnešních cenách.",
  "Safe withdrawal rate": "Bezpečná míra výběru",
  "Take out 4% of the pot in your first year and adjust for inflation after that, and the money has historically lasted 30 years or more. It's a rule of thumb, not a guarantee.":
    "Pokud v prvním roce vyberete 4 % portfolia a dále výběr navyšujete o inflaci, peníze historicky vydržely 30 let i déle. Je to orientační pravidlo, ne záruka.",
  "Your inputs": "Vaše údaje",
  Age: "Věk",
  "Age {n}": "Věk {n}",
  "Target age": "Cílový věk",
  "Target age {n}": "Cílový věk {n}",
  "Monthly spending": "Měsíční výdaje",
  "Saved today": "Naspořeno dnes",
  "Monthly saving": "Měsíční spoření",
  "Annual return": "Roční výnos",
  "All figures in today's money. Made with Money Kalkulačka · {date}":
    "Všechny částky v dnešních cenách. Vytvořeno v Money Kalkulačka · {date}",
  "Money Kalkulačka does arithmetic, not advice. These are projections based on assumptions you can change — not a prediction, and not a recommendation to buy or sell anything.":
    "Money Kalkulačka počítá, neradí. Jde o projekce založené na předpokladech, které můžete měnit — nejde o předpověď ani o doporučení cokoli koupit či prodat.",
  Pot: "Portfolio",
  "Put in": "Vloženo",
  "Your number — {v}": "Cílová částka — {v}",
  "{n} — you reach your number": "{n} — dosáhnete cílové částky",
  // Dashboard
  "Based on what you've saved in the other tabs. Everything stays in your browser.":
    "Vychází z toho, co máte uloženo v ostatních záložkách. Vše zůstává ve vašem prohlížeči.",
  "Nothing here yet": "Zatím tu nic není",
  "Financial snapshot": "Finanční snímek",
  "Save your whole situation — every tab at once — and come back to it, compare, or share it.":
    "Uložte celou svou situaci — všechny záložky najednou — a vraťte se k ní, porovnávejte nebo ji sdílejte.",
  "Unsaved current situation": "Aktuální neuložená situace",
  "Switch snapshot": "Přepnout snímek",
  "Save as new": "Uložit jako nový",
  "Update": "Aktualizovat",
  "Rename": "Přejmenovat",
  "Delete": "Smazat",
  "Copy share link": "Kopírovat odkaz",
  "Link copied": "Odkaz zkopírován",
  "Save to file": "Uložit do souboru",
  "Load from file": "Načíst ze souboru",
  "Save": "Uložit",
  "Cancel": "Zrušit",
  "Snapshot name": "Název snímku",
  "e.g. Baseline Oct 2026": "např. Výchozí stav říjen 2026",
  "Saved {date}": "Uloženo {date}",
  "Delete “{name}”?": "Smazat „{name}“?",
  "Someone shared a financial snapshot with you: {name}": "Někdo s vámi sdílel finanční snímek: {name}",
  "Loading it replaces the numbers in every tab. Save your own first if you want to keep them.":
    "Načtení nahradí čísla ve všech záložkách. Pokud si chcete ty své ponechat, nejdřív je uložte.",
  "Load and save": "Načíst a uložit",
  "Dismiss": "Zavřít",
  "That file isn't from Money Kalkulačka.": "Tento soubor nepochází z Money Kalkulačky.",
  "Switching replaces the numbers in every tab with this snapshot. Unsaved changes will be lost. Continue?":
    "Přepnutí nahradí čísla ve všech záložkách tímto snímkem. Neuložené změny se ztratí. Pokračovat?",
  "Edited since saved": "Od uložení upraveno",
  "Set up your investments →": "Nastavit investice →",
  "Set up your mortgage →": "Nastavit hypotéku →",
  "Answer the five questions →": "Zodpovědět pět otázek →",
  "Where you stand": "Kde stojíte",
  "Net worth": "Čisté jmění",
  "Assets minus debts": "Majetek minus dluhy",
  "Savings rate": "Míra spoření",
  "of your monthly income": "z měsíčního příjmu",
  "Add your income below": "Níže doplňte příjem",
  "Debt-to-assets": "Dluh k majetku",
  "Mortgage balance vs. what you own": "Zbývající hypotéka vůči majetku",
  "Retirement readiness": "Připravenost na rentu",
  "of your number": "z cílové částky",
  "Stop work at {age}": "Práce končí v {age}",
  "Monthly net income": "Měsíční čistý příjem",
  "What lands in your account each month. Used only for the savings rate — stored in this browser.":
    "Co vám měsíčně přijde na účet. Slouží jen pro míru spoření — uloženo v tomto prohlížeči.",
  "Where your money goes": "Kam peníze odcházejí",
  "Mortgage payment": "Splátka hypotéky",
  Investing: "Investování",
  "Free cash": "Volné peníze",
  "Where you're headed": "Kam míříte",
  "Net worth over time — savings growth minus the mortgage balance.":
    "Čisté jmění v čase — růst úspor minus zbývající hypotéka.",
  "In {years}: {v}": "Za {years}: {v}",
  Assets: "Majetek",
  Debt: "Dluh",
  // Mzda (salary)
  Salary: "Mzda",
  "Turn your gross salary into net pay: tax, insurance and child benefit, 2026 rules.":
    "Z hrubé mzdy na čistou: daň, pojištění a zvýhodnění na děti podle pravidel pro rok 2026.",
  "Start with Salary": "Začít mzdou",
  "From Mzda: {v}": "Z Mzdy: {v}",
  Use: "Použít",
  "Calculate from gross salary →": "Spočítat z hrubé mzdy →",
  "Calculate your net salary →": "Spočítat čistou mzdu →",
  "Fill in your numbers in Mzda, Invest, Mortgage and Plan — the dashboard brings them together here.":
    "Vyplňte svá čísla v záložkách Mzda, Investice, Hypotéka a Plán — přehled je tu spojí dohromady.",
  "Net salary": "Čistá mzda",
  "Gross to net for Czech employees, 2026 rules.":
    "Z hrubé na čistou pro zaměstnance v ČR, pravidla pro rok 2026.",
  "Gross monthly salary": "Hrubá měsíční mzda",
  "Signed tax declaration": "Podepsané prohlášení poplatníka",
  "Without it, no tax credits or child benefit are applied each month.":
    "Bez něj se měsíčně neuplatní žádné slevy na dani ani zvýhodnění na děti.",
  Children: "Děti",
  "of which with ZTP/P card": "z toho s průkazem ZTP/P",
  "Other discounts": "Další slevy",
  "Disability pension": "Invalidní důchod",
  None: "Žádný",
  "Degree I–II": "I. nebo II. stupeň",
  "Degree III": "III. stupeň",
  "ZTP/P card holder": "Držitel průkazu ZTP/P",
  "including child bonus {v}": "včetně daňového bonusu {v}",
  "Gross salary": "Hrubá mzda",
  "Social insurance": "Sociální pojištění",
  "Health insurance": "Zdravotní pojištění",
  "Tax before credits": "Daň před slevami",
  "Taxpayer credit": "Sleva na poplatníka",
  "Disability credit": "Sleva na invaliditu",
  "ZTP/P credit": "Sleva na držitele ZTP/P",
  "Child benefit": "Zvýhodnění na děti",
  "Income tax": "Záloha na daň",
  "Child bonus": "Daňový bonus",
  Insurance: "Pojištění",
  Tax: "Daň",
  Net: "Čistá",
  "Your employer pays {v}": "Zaměstnavatel za vás zaplatí {v}",
  "Gross plus {social} social and {health} health insurance.":
    "Hrubá mzda plus {social} sociální a {health} zdravotní pojištění.",
  "Salaries are calculated in Czech crowns (Kč) under 2026 Czech rules. Your other tabs stay in {currency}.":
    "Mzda se počítá v korunách (Kč) podle českých pravidel pro rok 2026. Ostatní záložky zůstávají v {currency}.",
  "Child bonus is paid only from a monthly salary of {v}.":
    "Daňový bonus se vyplácí až od měsíční mzdy {v}.",
  "Above the annual social insurance cap ({v}): over a full year part of your salary won't be charged social insurance, so real net pay will be a little higher.":
    "Nad ročním stropem sociálního pojištění ({v}): za celý rok se z části mzdy sociální pojištění neodvede, skutečná čistá mzda tak bude o něco vyšší.",
  "Health insurance includes a {v} top-up to the minimum base (salary below {min}). Students, pensioners and some others are exempt: see Other discounts.":
    "Zdravotní pojištění zahrnuje doplatek {v} do minimálního vyměřovacího základu (mzda pod {min}). Studenti, důchodci a některé další skupiny jsou osvobozeni: viz Další slevy.",
  "Exempt from the minimum health insurance base": "Osvobozen od minimálního vyměřovacího základu",
  "Students, pensioners, people on parental leave and others don't top up health insurance when they earn less than the minimum wage.":
    "Studenti, důchodci, rodiče na rodičovské a další skupiny nedoplácejí zdravotní pojištění, když vydělávají méně než minimální mzdu.",
  "You owe": "Doplácíte",
  "The health insurance top-up is more than your pay. Nothing is paid out and you still owe {v}, which you settle with your employer.":
    "Doplatek zdravotního pojištění je vyšší než mzda. Nic se nevyplatí a {v} ještě doplácíte, vyrovnáte se se zaměstnavatelem.",
  "Valid for {year} · an educational estimate, not payroll advice.":
    "Platí pro rok {year} · orientační výpočet, nikoli mzdové poradenství.",
  // Plan questionnaire: one step per pot
  "Your investments": "Vaše investice",
  "Your savings accounts": "Vaše spořicí účty",
  "Cash in savings accounts or term deposits rather than the market.":
    "Hotovost na spořicích účtech nebo termínovaných vkladech, ne na trhu.",
  "Use today's value, and only monthly amounts that will continue until your target age. Avoid counting your home unless you plan to sell it.":
    "Použijte dnešní hodnotu a jen měsíční částky, které budou pokračovat až do cílového věku. Nepočítejte bydlení, pokud ho neplánujete prodat.",
  "Invest tab: {a} today, {b} a month at {p}": "Záložka Investice: {a} dnes, {b} měsíčně při {p}",
  "Use these": "Použít",
  "Using these": "Použito",
  // Dashboard headline + what you own
  "Clear the mortgage and the home is fully yours.": "Splaťte hypotéku a bydlení je celé vaše.",
  "Enough to clear the mortgage too.": "Dost i na splacení hypotéky.",
  "With {d} still owed on the mortgage.": "Na hypotéce zbývá {d}.",
  "Home fully yours.": "Bydlení je celé vaše.",
  "Mortgage paid off.": "Hypotéka splacena.",
  "The pot that pays {v} a month": "Částka, která vám vyplácí {v} měsíčně",
  "What you'd need at {a} to stop work and clear the mortgage":
    "Kolik byste v {a} letech potřebovali, abyste přestali pracovat a splatili hypotéku",
  "Net worth at {age}": "Čisté jmění v {age} letech",
  "What you own": "Co vlastníte",
  "Your home": "Bydlení",
  Today: "Dnes",
  "At {age}": "V {age} letech",
  "Future values in today's money.": "Budoucí hodnoty v dnešních cenách.",
  "Total assets": "Majetek celkem",
  Liabilities: "Závazky",
  "No debt": "Bez dluhů",
  "Percentages are shares of total assets.": "Procenta jsou podílem na celkovém majetku.",
  "Your path to your number": "Cesta k cílové částce",
  // Scenarios
  Scenarios: "Scénáře",
  "{n} of {max} saved. Pick one to load it into every tab.":
    "Uloženo {n} z {max}. Vyberte jeden a načte se do všech záložek.",
  "Net worth · stop work at {age}": "Čisté jmění · konec práce v {age}",
  "Save current as a scenario": "Uložit aktuální stav jako scénář",
  "Save current as new": "Uložit aktuální stav jako nový",
  "You've changed numbers since saving “{name}”.": "Od uložení „{name}“ jste změnili čísla.",
  "Update “{name}”": "Aktualizovat „{name}“",
  "All {max} slots are used. Update one, or delete one to save another.":
    "Všechny {max} pozice jsou obsazené. Jeden scénář aktualizujte, nebo smažte, abyste mohli uložit další.",
  // Dashboard options menu
  Options: "Možnosti",
  "Scenario: {name}": "Scénář: {name}",
  "{v} · stop work at {age}": "{v} · konec práce v {age}",
  "Save as new scenario…": "Uložit jako nový scénář…",
  "Save as new scenario": "Uložit jako nový scénář",
  "All {max} slots used": "Všechny {max} pozice obsazené",
  "Rename “{name}”": "Přejmenovat „{name}“",
  "Delete “{name}”": "Smazat „{name}“",
  "Rename scenario": "Přejmenovat scénář",
};

type Vars = Record<string, string | number>;

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: "cs",
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("cs");
  useEffect(() => {
    const ls = window.localStorage;
    const pref = resolvePref(
      ls.getItem(STORAGE_KEY),
      isLang,
      hasLegacyData((k) => ls.getItem(k)),
      "en",
      "cs",
    );
    setLangState(pref.value);
    if (pref.persist) {
      try {
        ls.setItem(STORAGE_KEY, pref.value);
      } catch {
        /* ignore */
      }
    }
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  };
  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);

export const isLangValue = isLang;

export function useT() {
  const { lang } = useLang();
  const t = (key: string, vars?: Vars) => {
    let s = lang === "cs" ? (CS[key] ?? key) : key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
    return s;
  };
  /** Count + unit with correct plural form. unit: "year" | "month". */
  const count = (n: number, unit: "year" | "month") => {
    const abs = Math.abs(n);
    if (lang === "cs") {
      const forms = unit === "year" ? ["rok", "roky", "let"] : ["měsíc", "měsíce", "měsíců"];
      const f = !Number.isInteger(n) ? (unit === "year" ? "roku" : "měsíce") : abs === 1 ? forms[0] : abs >= 2 && abs <= 4 ? forms[1] : forms[2];
      return `${String(n).replace(".", ",")} ${f}`;
    }
    return `${n} ${unit}${abs === 1 ? "" : "s"}`;
  };
  /** Czech accusative-ish "o X letech" variants aren't needed; use count(). */
  return { t, count, lang, locale: lang === "cs" ? "cs-CZ" : "en-GB" };
}
