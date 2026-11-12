import type { Lang } from "./i18n";

/**
 * Explainer text under each calculator (~300 words). The Czech FAQ also feeds
 * the FAQPage JSON-LD, so search results always match what's on the page.
 * Figures are checked against calcSalary / computeInvest / solvePayment.
 */
export type SeoPage = "mzda" | "invest" | "mortgage" | "plan" | "duchod";
export type SeoArticleContent = {
  heading: string;
  paragraphs: string[];
  faqHeading: string;
  faq: { q: string; a: string }[];
};

export const SEO_CONTENT: Record<SeoPage, Record<Lang, SeoArticleContent>> = {
  mzda: {
    cs: {
      heading: "Jak se počítá čistá mzda v roce 2026",
      paragraphs: [
        "Z hrubé mzdy zaměstnanec odvádí 7,1 % na sociální pojištění a 4,5 % na zdravotní pojištění. Daň z příjmů je 15 % z hrubé mzdy; z části nad 146 901 Kč měsíčně se platí 23 %. Od vypočtené daně se odečítá sleva na poplatníka 2 570 Kč měsíčně, pokud máte u zaměstnavatele podepsané prohlášení.",
        "Daňové zvýhodnění na děti činí 1 267 Kč na první, 1 860 Kč na druhé a 2 320 Kč na třetí a každé další dítě. Nejdřív snižuje daň, a když je vyšší než daň, zbytek dostanete jako daňový bonus.",
        "Příklad: při hrubé mzdě 50 000 Kč zaplatíte 3 550 Kč sociální a 2 250 Kč zdravotní pojištění. Daň 7 500 Kč se po slevě na poplatníka sníží na 4 930 Kč. Čistá mzda je 39 270 Kč. Se dvěma dětmi klesne daň na 1 803 Kč a čistá mzda vzroste na 42 397 Kč. Zaměstnavatel za vás navíc odvede 24,8 % na sociální a 9 % na zdravotní pojištění, takže vás stojí 66 900 Kč.",
      ],
      faqHeading: "Časté otázky",
      faq: [
        {
          q: "Kolik je čistá mzda z 50 000 Kč hrubého v roce 2026?",
          a: "Bez dětí a s podepsaným prohlášením je to 39 270 Kč. Se dvěma dětmi 42 397 Kč.",
        },
        {
          q: "Co když mám mzdu nižší než minimální?",
          a: "Zdravotní pojištění se platí nejméně z minimální mzdy 22 400 Kč, takže zaměstnanec doplácí rozdíl. Studenti, důchodci a některé další skupiny jsou výjimkou.",
        },
        {
          q: "Proč je výsledek jen odhad?",
          a: "Kalkulačka počítá jeden měsíc. Roční zúčtování, strop sociálního pojištění 2 350 416 Kč ročně nebo jiné příjmy mohou konečnou částku změnit.",
        },
      ],
    },
    en: {
      heading: "How Czech net pay is calculated in 2026",
      paragraphs: [
        "Employees pay 7.1% social and 4.5% health insurance out of their gross salary. Income tax is 15% of gross pay, rising to 23% on the part above 146,901 CZK a month. A taxpayer credit of 2,570 CZK a month comes off the tax if you've signed the declaration with your employer.",
        "The child tax benefit is 1,267 CZK for the first child, 1,860 CZK for the second and 2,320 CZK for the third and each further child. It reduces the tax first; anything above the tax is paid out as a bonus.",
        "Example: on a gross salary of 50,000 CZK you pay 3,550 CZK social and 2,250 CZK health insurance. The 7,500 CZK tax drops to 4,930 CZK after the taxpayer credit, leaving 39,270 CZK net. With two children the tax falls to 1,803 CZK and net pay rises to 42,397 CZK. On top, your employer pays 24.8% social and 9% health insurance, so you cost them 66,900 CZK.",
      ],
      faqHeading: "Frequently asked questions",
      faq: [
        {
          q: "What is net pay from 50,000 CZK gross in 2026?",
          a: "39,270 CZK with no children and a signed declaration; 42,397 CZK with two children.",
        },
        {
          q: "What if I earn less than the minimum wage?",
          a: "Health insurance is charged on at least the 22,400 CZK minimum wage, so the employee tops up the difference. Students, pensioners and some others are exempt.",
        },
        {
          q: "Why is the result only an estimate?",
          a: "The calculator works on one month. The annual tax settlement, the 2,350,416 CZK yearly social insurance cap or other income can change the final figure.",
        },
      ],
    },
  },

  invest: {
    cs: {
      heading: "Jak funguje složené úročení",
      paragraphs: [
        "Když investujete pravidelně, výnos se každý rok připisuje nejen k vašim vkladům, ale i k výnosům z minulých let. Proto majetek roste pomalu na začátku a čím dál rychleji ke konci. Největší vliv má čas: deset let navíc často udělá víc než vyšší měsíční vklad.",
        "Příklad: 3 000 Kč měsíčně po dobu 20 let při průměrném výnosu 7 % ročně. Vložíte 720 000 Kč, na konci budete mít zhruba 1 563 000 Kč, takže 843 000 Kč tvoří výnos. Při inflaci 2 % to v dnešních cenách odpovídá přibližně 1 052 000 Kč.",
        "Kalkulačka vedle sebe ukáže i spořicí účet, abyste viděli, kolik stojí nechat peníze ležet na nízkém úroku.",
      ],
      faqHeading: "Časté otázky",
      faq: [
        {
          q: "Jaký výnos mám do kalkulačky zadat?",
          a: "Globální akciové indexové fondy historicky vynášely zhruba 7–8 % ročně před inflací. Spořicí účty obvykle 2–4 %. Budoucí výnos ale nikdo nezaručí.",
        },
        {
          q: "Co znamená hodnota v dnešních cenách?",
          a: "Konečná částka přepočtená o inflaci. Ukazuje, kolik si za ni koupíte dnes, a je proto lepší pro plánování než nominální částka.",
        },
        {
          q: "Počítá kalkulačka s daněmi a poplatky?",
          a: "Ne. Poplatky fondu odečtěte od očekávaného výnosu, například 7 % mínus 0,2 % poplatek dává 6,8 %.",
        },
        {
          q: "Kolik musím měsíčně investovat, abych měl za 20 let milion?",
          a: "Při výnosu 7 % ročně zhruba 1 920 Kč měsíčně. Když vydržíte 30 let místo 20, z 3 000 Kč měsíčně vyroste asi 3 660 000 Kč místo 1 563 000 Kč.",
        },
      ],
    },
    en: {
      heading: "How compound growth works",
      paragraphs: [
        "When you invest regularly, each year's return is added not only to your contributions but also to earlier returns. That's why wealth grows slowly at first and faster towards the end. Time matters most: ten extra years often does more than a higher monthly amount.",
        "Example: 3,000 CZK a month for 20 years at an average 7% a year. You put in 720,000 CZK and end up with about 1,563,000 CZK, so 843,000 CZK is growth. With 2% inflation that's worth roughly 1,052,000 CZK in today's money.",
        "The calculator can also show a savings account alongside, so you see what leaving money on a low rate costs you.",
      ],
      faqHeading: "Frequently asked questions",
      faq: [
        {
          q: "What return should I enter?",
          a: "Global stock index funds have historically returned around 7–8% a year before inflation; savings accounts usually 2–4%. No one can guarantee future returns.",
        },
        {
          q: "What does 'in today's money' mean?",
          a: "The final amount adjusted for inflation. It shows what it would buy today, which makes it better for planning than the nominal figure.",
        },
        {
          q: "Does it include taxes and fees?",
          a: "No. Subtract fund fees from the expected return — for example 7% minus a 0.2% fee gives 6.8%.",
        },
        {
          q: "How much do I need to invest monthly to have a million in 20 years?",
          a: "About 1,920 CZK a month at a 7% yearly return. Keep going for 30 years instead of 20 and 3,000 CZK a month grows to about 3,660,000 CZK rather than 1,563,000 CZK.",
        },
      ],
    },
  },

  mortgage: {
    cs: {
      heading: "Co udělá změna sazby s vaší hypotékou",
      paragraphs: [
        "Měsíční splátka hypotéky závisí na zbývající jistině, úrokové sazbě a době splácení. Už rozdíl jednoho procentního bodu znamená tisíce korun měsíčně a stovky tisíc za celou dobu splácení. Proto se vyplatí před koncem fixace porovnat nabídky.",
        "Příklad: zbývá vám splatit 3 000 000 Kč na 25 let. Při sazbě 4,5 % je splátka asi 16 675 Kč, při 5,5 % asi 18 423 Kč. To je o 1 748 Kč měsíčně víc a za 25 let přes 524 000 Kč navíc na úrocích.",
        "Kalkulačka ukáže obě sazby vedle sebe: splátku, celkové úroky a jak rychle hypotéku splatíte, když budete posílat víc.",
      ],
      faqHeading: "Časté otázky",
      faq: [
        {
          q: "Co je refixace hypotéky?",
          a: "Konec období, na které máte zafixovanou sazbu. Banka vám nabídne novou sazbu a vy můžete přijmout, vyjednávat nebo přejít jinam.",
        },
        {
          q: "Můžu při refixaci hypotéku splatit nebo převést?",
          a: "Ano. Ke konci fixace můžete hypotéku zcela nebo zčásti splatit bez poplatku, případně ji refinancovat u jiné banky.",
        },
        {
          q: "Vyplatí se zkrátit dobu splácení?",
          a: "Vyšší splátka a kratší doba výrazně sníží celkově zaplacené úroky. Zkuste v kalkulačce, kolik ušetříte.",
        },
        {
          q: "Proč na začátku splácím hlavně úroky?",
          a: "Hypotéka se splácí anuitně: splátka je stále stejná, ale úrok se počítá ze zbývající jistiny. U 3 000 000 Kč při 4,5 % jde z první splátky 16 675 Kč na úroky 11 250 Kč a jistinu snížíte jen o 5 425 Kč.",
        },
      ],
    },
    en: {
      heading: "What a rate change does to your mortgage",
      paragraphs: [
        "Your monthly mortgage payment depends on the remaining principal, the interest rate and the term. Even one percentage point means thousands of crowns a month and hundreds of thousands over the life of the loan, so it pays to compare offers before your fixed period ends.",
        "Example: 3,000,000 CZK left to repay over 25 years. At 4.5% the payment is about 16,675 CZK; at 5.5% about 18,423 CZK. That's 1,748 CZK more a month and over 524,000 CZK extra interest over 25 years.",
        "The calculator shows both rates side by side: the payment, total interest and how fast you'd clear the loan by paying more.",
      ],
      faqHeading: "Frequently asked questions",
      faq: [
        {
          q: "What is a mortgage refixation?",
          a: "The end of the period your rate is fixed for. The bank offers a new rate and you can accept it, negotiate or move elsewhere.",
        },
        {
          q: "Can I repay or move my mortgage at refixation?",
          a: "Yes. At the end of the fixed period you can repay all or part of the mortgage without a fee, or refinance with another bank.",
        },
        {
          q: "Is it worth shortening the term?",
          a: "A higher payment over a shorter term cuts the total interest a lot. Try it in the calculator to see how much you'd save.",
        },
        {
          q: "Why do I mostly pay interest at the start?",
          a: "Mortgages are repaid as an annuity: the payment stays the same, but interest is charged on the remaining principal. On 3,000,000 CZK at 4.5%, 11,250 CZK of the first 16,675 CZK payment is interest and only 5,425 CZK reduces the principal.",
        },
      ],
    },
  },

  plan: {
    cs: {
      heading: "Kolik potřebujete, abyste mohli přestat pracovat",
      paragraphs: [
        "Finanční nezávislost nastává ve chvíli, kdy vaše investice a úspory dokážou dlouhodobě pokrýt vaše výdaje. Běžným vodítkem je pravidlo 4 %: z majetku si každý rok vyberete 4 % a peníze by měly vydržet desítky let.",
        "Příklad: pokud chcete utrácet 30 000 Kč měsíčně, tedy 360 000 Kč ročně, potřebujete při 4 % zhruba 9 000 000 Kč. Při opatrnějších 3,5 % je to asi 10 300 000 Kč.",
        "Plán sečte, kolik měsíčně investujete a spoříte, a ukáže, v kolika letech cílové částky dosáhnete. Pak uvidíte, co pomůže nejvíc: vyšší vklad, nižší výdaje, nebo pozdější konec práce. Vše je v dnešních cenách.",
      ],
      faqHeading: "Časté otázky",
      faq: [
        {
          q: "Co je pravidlo 4 %?",
          a: "Vodítko z amerických studií: když si ročně vyberete 4 % počáteční hodnoty majetku a částku zvyšujete o inflaci, peníze historicky vydržely nejméně 30 let.",
        },
        {
          q: "Počítá plán se státním důchodem?",
          a: "Ne. Výsledek ukazuje, kdy byste vystačili jen z vlastních peněz, takže je spíše opatrný.",
        },
        {
          q: "Proč je vše v dnešních cenách?",
          a: "Aby čísla dávala smysl. 9 milionů za 25 let bude mít menší kupní sílu než dnes, proto kalkulačka počítá s výnosem po odečtení inflace.",
        },
        {
          q: "Kolik potřebuji na rentu 40 000 Kč měsíčně?",
          a: "Při pravidle 4 % zhruba 12 000 000 Kč (480 000 Kč ročně děleno 0,04). Každých 10 000 Kč měsíčních výdajů navíc zvýší cílovou částku o 3 miliony.",
        },
      ],
    },
    en: {
      heading: "How much you need to stop working",
      paragraphs: [
        "Financial independence starts when your investments and savings can cover your spending for the long term. A common guide is the 4% rule: take out 4% of your pot each year and the money should last for decades.",
        "Example: if you want to spend 30,000 CZK a month, or 360,000 CZK a year, you need about 9,000,000 CZK at 4%. At a more careful 3.5% it's around 10,300,000 CZK.",
        "The plan adds up what you invest and save each month and shows the age at which you reach that number. You then see what helps most: investing more, spending less or working a little longer. Everything is in today's money.",
      ],
      faqHeading: "Frequently asked questions",
      faq: [
        {
          q: "What is the 4% rule?",
          a: "A guide from US studies: withdraw 4% of your starting pot each year, raised with inflation, and historically the money lasted at least 30 years.",
        },
        {
          q: "Does the plan include the state pension?",
          a: "No. The result shows when you could live on your own money alone, so it errs on the careful side.",
        },
        {
          q: "Why is everything in today's money?",
          a: "So the numbers mean something. 9 million in 25 years will buy less than today, so the calculator uses returns after inflation.",
        },
        {
          q: "How much do I need to live on 40,000 CZK a month?",
          a: "About 12,000,000 CZK under the 4% rule (480,000 CZK a year divided by 0.04). Every extra 10,000 CZK of monthly spending adds 3 million to the target.",
        },
      ],
    },
  },

  duchod: {
    cs: {
      heading: "Jak se počítá důchod a kdy do něj půjdete",
      paragraphs: [
        "Důchodový věk závisí na roce narození. Ročníky 1961 až 1972 mají věk stanovený tabulkou (u žen se liší podle počtu vychovaných dětí), ročníky 1973 až 1988 odcházejí v 65 letech a 8 měsících plus jeden měsíc za každý rok narození po roce 1973. Kdo se narodil v roce 1989 nebo později, půjde do důchodu v 67 letech.",
        "Starobní důchod se skládá ze základní výměry, která je v roce 2026 přibližně 4 900 Kč měsíčně, a z procentní výměry. Ta závisí na vaší hrubé mzdě, počtu odpracovaných let a na době, kdy do důchodu nastoupíte. Za každé vychované dítě se přičítá výchovné 500 Kč. Pro nárok na důchod v řádném věku potřebujete 35 let pojištění, s 20 až 34 lety nastoupíte o pět let později.",
        "Doplňkové penzijní spoření (DPS) a dlouhodobý investiční produkt (DIP) důchod doplňují. Peníze z obou se uvolní nejdříve v 60 letech a po 120 měsících spoření. Příspěvky do DPS i DIP si můžete odečíst ze základu daně do společného limitu 48 000 Kč ročně. Všechny částky jsou odhad v dnešních cenách; přesné číslo spočítá důchodová kalkulačka ČSSZ.",
      ],
      faqHeading: "Časté otázky",
      faq: [
        {
          q: "Kdy půjdu do důchodu?",
          a: "Záleží na roce narození. Ročník 1973 odchází v 65 letech a 8 měsících, ročník 1988 v 66 letech a 11 měsících a všichni narození v roce 1989 a později v 67 letech. U žen narozených do roku 1972 věk snižuje počet vychovaných dětí.",
        },
        {
          q: "Kolik budu mít důchod?",
          a: "Důchod je přibližně 4 900 Kč základní výměry plus procentní výměra. Při hrubé mzdě 48 967 Kč a 44 letech pojištění vychází zhruba 21 800 Kč měsíčně v dnešních cenách. Je to odhad, přesnou částku určí ČSSZ.",
        },
        {
          q: "Kolik dává stát na penzijní spoření?",
          a: "Stát přispívá na DPS 20 % z vašeho měsíčního vkladu mezi 500 a 1 700 Kč, nejvýše 340 Kč měsíčně. Při vkladu pod 500 Kč nedostanete nic. Na příspěvky zaměstnavatele a na DIP státní příspěvek není.",
        },
        {
          q: "Jaký je rozdíl mezi DPS a DIP?",
          a: "DPS je spoření u penzijní společnosti se státním příspěvkem a omezenou volbou fondů. DIP je investiční produkt bez státního příspěvku, ale s širší nabídkou investic. Oba se otevírají v 60 letech po 120 měsících a o odpočet z daní se dělí o společný limit 48 000 Kč ročně.",
        },
        {
          q: "Co když budu pracovat méně než 35 let?",
          a: "S 20 až 34 lety pojištění nastoupíte do důchodu o pět let později, než je řádný věk. S méně než 20 lety nárok na starobní důchod nevznikne.",
        },
      ],
    },
    en: {
      heading: "How the Czech state pension is calculated and when you can retire",
      paragraphs: [
        "Your retirement age depends on the year you were born. Those born 1961 to 1972 follow a table (for women it varies with the number of children raised), those born 1973 to 1988 retire at 65 years 8 months plus one month for each birth year after 1973. Anyone born in 1989 or later retires at 67.",
        "The old-age pension is a basic amount, about 4,900 CZK a month in 2026, plus a percentage amount. The percentage amount depends on your gross salary, the years you worked and when you retire. Each child you raised adds 500 CZK. You need 35 years of insurance to retire at the statutory age; with 20 to 34 years you retire five years later.",
        "Supplementary pension savings (DPS) and the long-term investment product (DIP) top this up. Money from both opens at 60 at the earliest, after 120 months of saving. Contributions to DPS and DIP share one tax deduction limit of 48,000 CZK a year. All figures are estimates in today's money; for the exact number use the ČSSZ pension calculator.",
      ],
      faqHeading: "Frequently asked questions",
      faq: [
        {
          q: "When will I retire?",
          a: "It depends on your birth year. Born in 1973 you retire at 65 years 8 months, born in 1988 at 66 years 11 months, and everyone born in 1989 or later at 67. For women born up to 1972 the number of children raised lowers the age.",
        },
        {
          q: "How much pension will I get?",
          a: "About 4,900 CZK basic amount plus a percentage amount. On a gross salary of 48,967 CZK and 44 insured years that comes to roughly 21,800 CZK a month in today's money. It is an estimate; ČSSZ sets the exact amount.",
        },
        {
          q: "How much does the state add to pension savings?",
          a: "For DPS the state adds 20% of your monthly contribution between 500 and 1,700 CZK, at most 340 CZK a month. Below 500 CZK you get nothing. There is no state contribution on employer payments or on DIP.",
        },
        {
          q: "What is the difference between DPS and DIP?",
          a: "DPS is saving with a pension company, with a state contribution and a limited choice of funds. DIP is an investment product with no state contribution but a wider choice of investments. Both open at 60 after 120 months, and they share one tax deduction limit of 48,000 CZK a year.",
        },
        {
          q: "What if I work fewer than 35 years?",
          a: "With 20 to 34 years of insurance you retire five years after the statutory age. With fewer than 20 years you have no right to an old-age pension.",
        },
      ],
    },
  },
};
