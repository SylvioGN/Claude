// Names and kid-friendly fun facts for every tour stop, in en/it/fr/es/pt (pt is Brazilian, matching ui.js).
// Shape: CONTENT[stopId] = { name: {en, it, fr, es, pt}, facts: [{en, it, fr, es, pt}, ...] }
// Every fact was checked against the pages listed in SOURCES and is at most 120 characters long.
// Facts are ordered best first: the photo card shows the first two, read-aloud joins them with '. '.

export const CONTENT = {
  terrazza: {
    name: { en: 'Pincio Terrace', it: 'Terrazza del Pincio', fr: 'Terrasse du Pincio', es: 'Terraza del Pincio', pt: 'Terraço do Pincio' },
    facts: [
      {
        en: 'The obelisk below is from Egypt and over 3,000 years old. Four stone lions spit water around it!',
        it: "L'obelisco qui sotto viene dall'Egitto e ha più di 3000 anni. Attorno, quattro leoni sputano acqua!",
        fr: "L'obélisque en bas vient d'Égypte et a plus de 3 000 ans. Autour, quatre lions crachent de l'eau !",
        es: 'El obelisco de abajo viene de Egipto y tiene más de 3000 años. ¡Cuatro leones escupen agua alrededor!',
        pt: 'O obelisco lá embaixo veio do Egito e tem mais de 3 mil anos. Em volta, quatro leões cospem água!',
      },
      {
        en: "See the big dome far away? It's Saint Peter's, more than 2 kilometres from here!",
        it: 'Vedi la grande cupola laggiù? È San Pietro, a più di 2 chilometri da qui!',
        fr: "Tu vois le grand dôme au loin ? C'est Saint-Pierre, à plus de 2 kilomètres d'ici !",
        es: '¿Ves la gran cúpula a lo lejos? ¡Es San Pedro, a más de 2 kilómetros de aquí!',
        pt: 'Está vendo a grande cúpula lá longe? É São Pedro, a mais de 2 quilômetros daqui!',
      },
      {
        en: 'The two churches below look like twins, but they are not exactly the same. Can you spot a difference?',
        it: 'Le due chiese qui sotto sembrano gemelle, ma non sono proprio uguali. Riesci a trovare una differenza?',
        fr: "Les deux églises en bas ont l'air jumelles, mais elles ne sont pas tout à fait pareilles. Trouve une différence !",
        es: 'Las dos iglesias de abajo parecen gemelas, pero no son del todo iguales. ¿Encuentras alguna diferencia?',
        pt: 'As duas igrejas lá embaixo parecem gêmeas, mas não são iguaizinhas. Você consegue achar uma diferença?',
      },
    ],
  },

  idrocronometro: {
    name: { en: 'Pincio Water Clock', it: 'Idrocronometro del Pincio', fr: 'Horloge à eau du Pincio', es: 'Reloj de agua del Pincio', pt: 'Relógio de água do Pincio' },
    facts: [
      {
        en: 'This clock runs on water, which fills two little tubs that rock up and down like a seesaw!',
        it: "Questo orologio va ad acqua! L'acqua riempie due vaschette che vanno su e giù come una bilancia.",
        fr: "Cette horloge marche à l'eau ! L'eau remplit deux bacs qui montent et descendent comme une balance.",
        es: '¡Este reloj funciona con agua! El agua llena dos cubetas que suben y bajan como un balancín.',
        pt: 'Este relógio funciona com água! A água enche duas vasilhas que sobem e descem como uma gangorra.',
      },
      {
        en: 'Its tower is about 4 metres tall and looks like tree trunks. It stands on a tiny island in a pond.',
        it: 'La torretta è alta circa 4 metri e sembra fatta di tronchi. Sta su un isolotto in un laghetto.',
        fr: "Sa tourelle d'environ 4 mètres imite des troncs d'arbre. Elle est sur un îlot, dans un bassin.",
        es: 'Su torre mide unos 4 metros y parece hecha de troncos. Está en una islita de un estanque.',
        pt: 'A torre tem uns 4 metros e parece feita de troncos. Ela fica numa ilhota no meio de um laguinho.',
      },
      {
        en: 'A friar called Father Embriaco invented it. It was set up here in 1873, more than 150 years ago.',
        it: "L'ha inventato un frate, Padre Embriaco. È stato messo qui nel 1873, più di 150 anni fa.",
        fr: "Le père Embriaco, un religieux, l'a inventée. Elle a été installée ici en 1873, il y a plus de 150 ans.",
        es: 'Lo inventó un fraile, el padre Embriaco. Lo pusieron aquí en 1873, ¡hace más de 150 años!',
        pt: 'Quem inventou foi um frade, o padre Embriaco. Ele foi instalado aqui em 1873, há mais de 150 anos!',
      },
    ],
  },

  lago: {
    name: { en: 'Temple of Aesculapius', it: 'Tempio di Esculapio', fr: "Temple d'Esculape", es: 'Templo de Esculapio', pt: 'Templo de Esculápio' },
    facts: [
      {
        en: 'This temple stands on a little man-made island in the lake. It is more than 230 years old!',
        it: 'Questo tempio sta su un isolotto artificiale in mezzo al laghetto. Ha più di 230 anni!',
        fr: 'Ce temple est sur une petite île construite au milieu du lac. Il a plus de 230 ans !',
        es: 'Este templo está en una islita construida en medio del lago. ¡Lo hicieron hace más de 230 años!',
        pt: 'Este templo fica numa ilhota feita pelas pessoas no meio do lago. Ele tem mais de 230 anos!',
      },
      {
        en: 'Turtles and lots of water birds live in this lake. Can you spot one?',
        it: 'In questo laghetto vivono tartarughe e tanti uccelli acquatici. Riesci a vederne uno?',
        fr: "Des tortues et plein d'oiseaux d'eau vivent dans ce lac. Tu en vois un ?",
        es: 'En este lago viven tortugas y muchas aves acuáticas. ¿Ves alguna?',
        pt: 'Tartarugas e muitas aves aquáticas vivem neste lago. Você consegue ver alguma?',
      },
      {
        en: 'Aesculapius was the Roman god of medicine. His sign, a snake around a stick, is still used by doctors today!',
        it: 'Esculapio era il dio romano della medicina. Il suo simbolo, un serpente attorno a un bastone, si usa ancora oggi!',
        fr: "Esculape était le dieu romain de la médecine. Son symbole, un serpent autour d'un bâton, sert encore aujourd'hui !",
        es: 'Esculapio era el dios romano de la medicina. ¡Su símbolo, una serpiente en un bastón, aún se usa en medicina!',
        pt: 'Esculápio era o deus romano da medicina. O símbolo dele, uma cobra num bastão, é usado na medicina até hoje!',
      },
    ],
  },

  siena: {
    name: { en: 'Piazza di Siena', it: 'Piazza di Siena', fr: 'Piazza di Siena', es: 'Piazza di Siena', pt: 'Piazza di Siena' },
    facts: [
      {
        en: 'Every May, top riders and horses jump over fences here in a famous show that started in 1922.',
        it: 'Ogni maggio, cavalli e cavalieri campioni saltano gli ostacoli qui, in un concorso nato nel 1922.',
        fr: 'Tous les ans en mai, des champions à cheval sautent des obstacles ici, dans un concours créé en 1922.',
        es: 'Cada mayo, jinetes y caballos campeones saltan obstáculos aquí, en un concurso que empezó en 1922.',
        pt: 'Todo mês de maio, cavaleiros e cavalos campeões saltam obstáculos aqui, num concurso criado em 1922.',
      },
      {
        en: 'At the 1960 Olympic Games, horses competed right here, in front of seats for 15,000 people!',
        it: 'Alle Olimpiadi del 1960 i cavalli gareggiarono proprio qui, davanti a tribune per 15.000 persone!',
        fr: 'Aux Jeux olympiques de 1960, des chevaux ont concouru ici, devant des tribunes pour 15 000 personnes !',
        es: '¡En los Juegos Olímpicos de 1960, los caballos compitieron aquí, con gradas para 15.000 personas!',
        pt: 'Nas Olimpíadas de 1960, cavalos competiram bem aqui, com arquibancadas para 15 mil pessoas!',
      },
      {
        en: 'It is named after Siena, a city in Tuscany where the Borghese family came from.',
        it: 'Si chiama così per Siena, la città toscana da cui veniva la famiglia Borghese.',
        fr: "Elle porte le nom de Sienne, la ville de Toscane d'où venait la famille Borghese.",
        es: 'Se llama así por Siena, la ciudad de la Toscana de donde venía la familia Borghese.',
        pt: 'O nome vem de Siena, a cidade da Toscana de onde vinha a família Borghese.',
      },
    ],
  },

  fortezzuola: {
    name: { en: 'Pietro Canonica Museum', it: 'Museo Pietro Canonica', fr: 'Musée Pietro Canonica', es: 'Museo Pietro Canonica', pt: 'Museu Pietro Canonica' },
    facts: [
      {
        en: 'Long ago, this little castle was home to ostriches, peacocks and ducks!',
        it: 'Tanto tempo fa, in questo piccolo castello vivevano struzzi, pavoni e anatre!',
        fr: 'Il y a longtemps, des autruches, des paons et des canards vivaient dans ce petit château !',
        es: '¡Hace mucho tiempo, en este castillito vivían avestruces, pavos reales y patos!',
        pt: 'Há muito tempo, avestruzes, pavões e patos viviam neste castelinho!',
      },
      {
        en: 'Sculptor Pietro Canonica made statues of horses and kings, and also wrote operas, where everyone sings!',
        it: 'Lo scultore Pietro Canonica scolpiva cavalli e re, e componeva anche opere liriche, dove tutti cantano!',
        fr: 'Pietro Canonica sculptait des chevaux et des rois. Il composait aussi des opéras, où tout le monde chante !',
        es: 'El escultor Pietro Canonica esculpía caballos y reyes, ¡y también componía óperas, donde todos cantan!',
        pt: 'O escultor Pietro Canonica esculpia cavalos e reis, e também compunha óperas, em que todo mundo canta!',
      },
      {
        en: 'Canonica lived and worked here until 1959, when he was 90. Now his home is a museum.',
        it: 'Canonica visse e lavorò qui fino al 1959, quando aveva 90 anni. Ora la sua casa è un museo.',
        fr: "Canonica a vécu et travaillé ici jusqu'en 1959, à 90 ans. Sa maison est maintenant un musée.",
        es: 'Canonica vivió y trabajó aquí hasta 1959, con 90 años. Ahora su casa es un museo.',
        pt: 'Canonica viveu e trabalhou aqui até 1959, aos 90 anos. Hoje a casa dele é um museu.',
      },
    ],
  },

  globe: {
    name: { en: 'Globe Theatre', it: 'Globe Theatre', fr: 'Théâtre du Globe', es: 'Teatro Globe', pt: 'Teatro Globe' },
    facts: [
      {
        en: "It is a wooden copy of Shakespeare's famous Globe theatre in London, made of French oak.",
        it: 'È una copia in legno del famoso Globe di Shakespeare a Londra, fatta di rovere francese.',
        fr: "C'est une copie en bois du célèbre théâtre du Globe de Shakespeare, à Londres, en chêne de France.",
        es: 'Es una copia de madera del famoso teatro Globe de Shakespeare en Londres, hecha de roble francés.',
        pt: 'É uma cópia de madeira do famoso teatro Globe de Shakespeare, em Londres, feita de carvalho francês.',
      },
      {
        en: 'It was built in 2003 in just over 3 months!',
        it: 'È stato costruito nel 2003 in poco più di 3 mesi!',
        fr: 'Il a été construit en 2003, en à peine plus de 3 mois !',
        es: '¡Lo construyeron en 2003 en poco más de 3 meses!',
        pt: 'Ele foi construído em 2003 em pouco mais de 3 meses!',
      },
      {
        en: "Up to 415 people watch the plays standing up in the middle, just like in Shakespeare's time.",
        it: 'Fino a 415 persone guardano gli spettacoli in piedi al centro, proprio come ai tempi di Shakespeare.',
        fr: "Jusqu'à 415 personnes regardent les pièces debout au milieu, comme à l'époque de Shakespeare.",
        es: 'Hasta 415 personas ven las obras de pie en el centro, igual que en la época de Shakespeare.',
        pt: 'Até 415 pessoas assistem às peças em pé no meio, como na época de Shakespeare.',
      },
    ],
  },

  bioparco: {
    name: { en: 'Bioparco Zoo', it: 'Bioparco', fr: 'Zoo Bioparco', es: 'Zoo Bioparco', pt: 'Zoológico Bioparco' },
    facts: [
      {
        en: 'Komodo dragons live here: the biggest lizards in the world, up to 3 metres long!',
        it: 'Qui vivono i draghi di Komodo, le lucertole più grandi del mondo: fino a 3 metri!',
        fr: "Ici vivent des dragons de Komodo, les plus grands lézards du monde : jusqu'à 3 mètres !",
        es: '¡Aquí viven dragones de Komodo, los lagartos más grandes del mundo: hasta 3 metros!',
        pt: 'Aqui vivem dragões-de-komodo, os maiores lagartos do mundo: até 3 metros!',
      },
      {
        en: 'About 200 kinds of animals live here, like tigers, lions, bears, orangutans and chimpanzees.',
        it: 'Qui vivono circa 200 specie di animali: tigri, leoni, orsi, oranghi e scimpanzé.',
        fr: "Environ 200 espèces d'animaux vivent ici : tigres, lions, ours, orangs-outans et chimpanzés.",
        es: 'Aquí viven unas 200 especies de animales, como tigres, leones, osos, orangutanes y chimpancés.',
        pt: 'Cerca de 200 espécies de animais vivem aqui, como tigres, leões, ursos, orangotangos e chimpanzés.',
      },
      {
        en: "Rome's zoo opened in 1911, more than 100 years ago, with animal homes built without bars.",
        it: 'Lo zoo di Roma ha aperto nel 1911, più di 100 anni fa, con recinti per gli animali senza sbarre.',
        fr: 'Le zoo de Rome a ouvert en 1911, il y a plus de 100 ans, avec des enclos sans barreaux.',
        es: 'El zoo de Roma abrió en 1911, hace más de 100 años, con recintos para los animales sin barrotes.',
        pt: 'O zoológico de Roma abriu em 1911, há mais de 100 anos, com recintos para os animais sem grades.',
      },
    ],
  },

  galleria: {
    name: { en: 'Galleria Borghese', it: 'Galleria Borghese', fr: 'Galleria Borghese', es: 'Galleria Borghese', pt: 'Galleria Borghese' },
    facts: [
      {
        en: 'Inside, a marble statue shows a girl turning into a tree, with leaves growing from her fingers!',
        it: "Dentro c'è una statua di marmo di una ragazza che diventa un albero: le spuntano foglie dalle dita!",
        fr: 'Une statue de marbre montre une fille qui se change en arbre : des feuilles poussent de ses doigts !',
        es: 'Una estatua de mármol muestra a una chica que se convierte en árbol: ¡le salen hojas de los dedos!',
        pt: 'Lá dentro, uma estátua de mármore mostra uma moça virando árvore, com folhas saindo dos dedos!',
      },
      {
        en: "Napoleon's sister Pauline is here as a life-size marble statue, lying on a sofa with an apple.",
        it: 'Paolina, la sorella di Napoleone, è qui in una statua di marmo, sdraiata con una mela in mano.',
        fr: 'Pauline, la sœur de Napoléon, est ici en statue de marbre grandeur nature, allongée avec une pomme.',
        es: 'Paulina, la hermana de Napoleón, está aquí en una estatua de mármol, recostada con una manzana.',
        pt: 'Paulina, irmã de Napoleão, está aqui numa estátua de mármore, deitada com uma maçã na mão.',
      },
      {
        en: 'It has 6 paintings by Caravaggio, like a boy holding a big basket of fruit.',
        it: 'Ci sono 6 quadri di Caravaggio, come il ragazzo con un grande canestro di frutta.',
        fr: 'On y trouve 6 tableaux du Caravage, comme un garçon qui tient un grand panier de fruits.',
        es: 'Tiene 6 cuadros de Caravaggio, como el de un chico con una gran cesta de fruta.',
        pt: 'Tem 6 quadros de Caravaggio, como o de um menino com uma grande cesta de frutas.',
      },
    ],
  },

  cavallimarini: {
    name: { en: 'Seahorse Fountain', it: 'Fontana dei Cavalli Marini', fr: 'Fontaine des chevaux marins', es: 'Fuente de los caballos marinos', pt: 'Fonte dos cavalos-marinhos' },
    facts: [
      {
        en: 'Four sea horses leap out of the water: they have horse legs and fish tails!',
        it: "Quattro cavalli marini saltano fuori dall'acqua: hanno zampe da cavallo e coda da pesce!",
        fr: "Quatre chevaux marins bondissent de l'eau : pattes de cheval et queue de poisson !",
        es: 'Cuatro caballos marinos saltan del agua: ¡tienen patas de caballo y cola de pez!',
        pt: 'Quatro cavalos-marinhos pulam para fora da água: eles têm patas de cavalo e cauda de peixe!',
      },
      {
        en: 'They hold up the top bowl with their heads and tails, and water squirts out between their legs.',
        it: "Reggono la vasca in alto con la testa e la coda, e tra le loro zampe spuntano zampilli d'acqua.",
        fr: "Ils portent la vasque du haut avec leur tête et leur queue, et de l'eau jaillit entre leurs pattes.",
        es: 'Sostienen la taza de arriba con la cabeza y la cola, y entre sus patas salen chorros de agua.',
        pt: 'Eles seguram a bacia de cima com a cabeça e a cauda, e jatos de água saem entre as patas.',
      },
      {
        en: 'It was built in 1791. People say the idea came from a cameo: a tiny old carved jewel!',
        it: "Fu costruita nel 1791. Si racconta che l'idea venne da un cammeo, un antico gioiello scolpito!",
        fr: "Elle a été construite en 1791. On raconte que l'idée est venue d'un camée, un vieux bijou sculpté !",
        es: 'Se construyó en 1791. ¡Dicen que la idea salió de un camafeo, una joya antigua tallada!',
        pt: 'Ela foi construída em 1791. Dizem que a ideia veio de um camafeu, uma joia antiga esculpida!',
      },
    ],
  },

  diana: {
    name: { en: 'Temple of Diana', it: 'Tempio di Diana', fr: 'Temple de Diane', es: 'Templo de Diana', pt: 'Templo de Diana' },
    facts: [
      {
        en: 'Diana was the Roman goddess of hunting and of the Moon. She carried a bow and arrows.',
        it: 'Diana era la dea romana della caccia e della Luna. Portava arco e frecce.',
        fr: 'Diane était la déesse romaine de la chasse et de la Lune. Elle portait un arc et des flèches.',
        es: 'Diana era la diosa romana de la caza y de la Luna. Llevaba un arco y flechas.',
        pt: 'Diana era a deusa romana da caça e da Lua. Ela carregava arco e flechas.',
      },
      {
        en: 'The Diana statue that stood inside was sold to France in 1807. Now it is in the Louvre in Paris!',
        it: 'La statua di Diana che stava qui dentro fu venduta alla Francia nel 1807. Ora è al Louvre di Parigi!',
        fr: 'La statue de Diane qui était ici a été vendue à la France en 1807. Elle est au Louvre, à Paris !',
        es: 'La estatua de Diana que estaba dentro se vendió a Francia en 1807. ¡Ahora está en el Louvre de París!',
        pt: 'A estátua de Diana que ficava aqui foi vendida à França em 1807. Hoje está no Louvre, em Paris!',
      },
      {
        en: 'This little round temple was built in 1789, in the style of the fancy English gardens of that time.',
        it: 'Questo tempietto rotondo fu costruito nel 1789, nello stile dei giardini inglesi, allora di gran moda.',
        fr: "Ce petit temple rond a été construit en 1789, à la mode des jardins anglais de l'époque.",
        es: 'Este pequeño templo redondo se construyó en 1789, al estilo de los jardines ingleses de moda entonces.',
        pt: 'Este templinho redondo foi construído em 1789, no estilo dos jardins ingleses, que estavam na moda.',
      },
    ],
  },

  raffaello: {
    name: { en: 'Casina di Raffaello', it: 'Casina di Raffaello', fr: 'Casina di Raffaello', es: 'Casina di Raffaello', pt: 'Casina di Raffaello' },
    facts: [
      {
        en: 'Today it is a play centre for children from 3 to 14, full of games, books and crafts.',
        it: 'Oggi è una ludoteca per bambini e ragazzi dai 3 ai 14 anni, piena di giochi, libri e laboratori.',
        fr: "Aujourd'hui, c'est une ludothèque pour les 3-14 ans, pleine de jeux, de livres et d'ateliers.",
        es: 'Hoy es una ludoteca para niños de 3 a 14 años, llena de juegos, libros y talleres.',
        pt: 'Hoje é uma brinquedoteca para crianças de 3 a 14 anos, cheia de jogos, livros e oficinas.',
      },
      {
        en: 'It opened for kids on 10 March 2006, so in 2026 it had its 20th birthday!',
        it: 'Ha aperto per i bambini il 10 marzo 2006: nel 2026 ha compiuto 20 anni!',
        fr: 'Elle a ouvert pour les enfants le 10 mars 2006 : en 2026, elle a fêté ses 20 ans !',
        es: 'Abrió para los niños el 10 de marzo de 2006: ¡en 2026 cumplió 20 años!',
        pt: 'Ela abriu para as crianças em 10 de março de 2006: em 2026, fez 20 anos!',
      },
      {
        en: 'Long ago it was called the "little palace of the mulberry trees". Mulberries are sweet berries!',
        it: "Tanto tempo fa si chiamava «Palazzina dell'Arboreto di Gelsi». Le more di gelso sono dolcissime!",
        fr: "Il y a longtemps, on l'appelait le « petit palais des mûriers ». Les mûres sont des baies sucrées !",
        es: 'Hace mucho tiempo se llamaba «palacete de las moreras». ¡Las moras son frutos muy dulces!',
        pt: 'Há muito tempo, ela se chamava "palacete das amoreiras". As amoras são frutinhas docinhas!',
      },
    ],
  },

  cinema: {
    name: { en: 'Cinema dei Piccoli', it: 'Cinema dei Piccoli', fr: 'Cinema dei Piccoli', es: 'Cinema dei Piccoli', pt: 'Cinema dei Piccoli' },
    facts: [
      {
        en: 'It is in the Guinness World Records as the smallest cinema building in the world!',
        it: 'È nel Guinness dei primati come il più piccolo edificio per il cinema del mondo!',
        fr: "Il est dans le Livre Guinness des records : c'est le plus petit bâtiment de cinéma du monde !",
        es: '¡Está en el Libro Guinness de los récords como el edificio de cine más pequeño del mundo!',
        pt: 'Ele está no Guinness, o livro dos recordes, como o menor prédio de cinema do mundo!',
      },
      {
        en: "It opened in 1934 named after Mickey Mouse, but Disney didn't like that, so the name changed!",
        it: 'Quando aprì nel 1934 portava il nome di Topolino, ma alla Disney non piacque e così cambiò nome!',
        fr: "À son ouverture en 1934, il portait le nom de Mickey, mais Disney n'a pas aimé : il a changé de nom !",
        es: 'Abrió en 1934 con el nombre de Mickey Mouse, pero a Disney no le gustó, ¡y le cambiaron el nombre!',
        pt: 'Quando abriu, em 1934, tinha o nome do Mickey, mas a Disney não gostou, e o nome mudou!',
      },
      {
        en: 'It has only 63 seats. Big cinemas can have hundreds!',
        it: 'Ha solo 63 posti a sedere. I cinema grandi ne hanno centinaia!',
        fr: "Il n'a que 63 places. Les grands cinémas en ont des centaines !",
        es: 'Solo tiene 63 butacas. ¡Los cines grandes tienen cientos!',
        pt: 'Ele tem só 63 lugares. Os cinemas grandes têm centenas!',
      },
    ],
  },
};

// General fun facts about the whole park (loading tips, title screen, idle moments).
export const PARK_FACTS = [
  {
    en: 'Villa Borghese is huge: 80 hectares, about as big as 100 football pitches!',
    it: 'Villa Borghese è enorme: 80 ettari, grande come circa 100 campi da calcio!',
    fr: 'La Villa Borghese est immense : 80 hectares, soit environ 100 terrains de foot !',
    es: '¡Villa Borghese es enorme: 80 hectáreas, como unos 100 campos de fútbol!',
    pt: 'A Villa Borghese é enorme: 80 hectares, mais ou menos 100 campos de futebol!',
  },
  {
    en: 'The tall trees with flat, umbrella-like tops are stone pines, a symbol of Rome. Their cones hide tasty pine nuts!',
    it: 'Gli alti alberi con la chioma piatta a ombrello sono pini domestici, simbolo di Roma. Nelle pigne ci sono i pinoli!',
    fr: 'Les grands arbres en forme de parasol sont des pins parasols, symbole de Rome. Leurs pommes de pin cachent des pignons !',
    es: 'Los árboles altos con copa de paraguas son pinos piñoneros, símbolo de Roma. ¡Sus piñas esconden piñones!',
    pt: 'As árvores altas com copa de guarda-chuva são pinheiros-mansos, símbolo de Roma. As pinhas têm pinhões gostosos!',
  },
  {
    en: "Cardinal Scipione Borghese, the Pope's nephew, started making these gardens more than 400 years ago.",
    it: 'Il cardinale Scipione Borghese, nipote del Papa, iniziò a creare questi giardini più di 400 anni fa.',
    fr: 'Le cardinal Scipione Borghese, neveu du pape, a commencé ces jardins il y a plus de 400 ans.',
    es: 'El cardenal Scipione Borghese, sobrino del papa, empezó estos jardines hace más de 400 años.',
    pt: 'O cardeal Scipione Borghese, sobrinho do papa, começou estes jardins há mais de 400 anos.',
  },
  {
    en: "It was the Borghese family's private garden. Since 1903 it has been a park for everyone!",
    it: 'Era il giardino privato della famiglia Borghese. Dal 1903 è un parco aperto a tutti!',
    fr: "C'était le jardin privé de la famille Borghese. Depuis 1903, c'est un parc ouvert à tous !",
    es: 'Era el jardín privado de la familia Borghese. ¡Desde 1903 es un parque para todos!',
    pt: 'Era o jardim particular da família Borghese. Desde 1903, é um parque aberto a todos!',
  },
];

// Where each fact was checked (stop ids, plus 'park' for PARK_FACTS).
export const SOURCES = {
  terrazza: [
    'https://en.wikipedia.org/wiki/Flaminio_Obelisk',
    'https://en.wikipedia.org/wiki/Piazza_del_Popolo',
    'https://turismoroma.it/en/places/fountain-lions',
    'https://www.voicemap.me/attraction/rome/tererazza-del-pincio-self-guided-audio-tours',
  ],
  idrocronometro: [
    'https://it.wikipedia.org/wiki/Idrocronometro_del_Pincio',
    'https://en.wikipedia.org/wiki/Pincio',
  ],
  lago: [
    'https://it.wikipedia.org/wiki/Tempio_di_Esculapio_(Villa_Borghese)',
    'https://en.wikipedia.org/wiki/Temple_of_Aesculapius_(Villa_Borghese)',
    'https://www.wantedinrome.com/news/villa-borghese-lake-reopens.html',
    'https://en.wikipedia.org/wiki/Rod_of_Asclepius',
  ],
  siena: [
    'https://it.wikipedia.org/wiki/Piazza_di_Siena',
    'https://en.wikipedia.org/wiki/Villa_Borghese_gardens',
    'https://www.romeing.it/?p=98159',
  ],
  fortezzuola: [
    'https://it.wikipedia.org/wiki/Museo_Pietro_Canonica',
    'https://it.wikipedia.org/wiki/Pietro_Canonica',
    'https://it.wikipedia.org/wiki/Villa_Borghese',
  ],
  globe: [
    'https://www.zetema.it/wp-content/uploads/5.-IL-GLOBE-IN-CIFRE.pdf',
    'https://www.wantedinrome.com/whatson/globe-theatre-romes-shakespearean-festival-in-villa-borghese.html',
    'https://en.wikipedia.org/wiki/Globe_Theatre',
  ],
  bioparco: [
    'https://it.wikipedia.org/wiki/Bioparco_di_Roma',
    'https://turismoroma.it/it/luoghi/bioparco',
    'https://en.wikipedia.org/wiki/Komodo_dragon',
  ],
  galleria: [
    'https://en.wikipedia.org/wiki/Apollo_and_Daphne_(Bernini)',
    'https://en.wikipedia.org/wiki/Venus_Victrix_(Canova)',
    'https://en.wikipedia.org/wiki/Pauline_Bonaparte',
    'https://en.wikipedia.org/wiki/Galleria_Borghese',
  ],
  cavallimarini: [
    'https://turismoroma.it/it/luoghi/fontana-dei-cavalli-marini-villa-borghese',
    'https://en.wikipedia.org/wiki/Villa_Borghese_gardens',
    'https://it.wikipedia.org/wiki/Villa_Borghese',
  ],
  diana: [
    'https://romeartlover.it/Vasi187a.html',
    'https://www.tickets-rome.com/it/borghese-gallery/villa-borghese/gardens/',
    'https://en.wikipedia.org/wiki/Borghese_Collection',
    'https://en.wikipedia.org/wiki/Diana_(mythology)',
    'https://it.wikipedia.org/wiki/Villa_Borghese',
  ],
  raffaello: [
    'https://turismoroma.it/en/places/casina-di-raffaello',
    'https://www.zetema.it/wp-content/uploads/2026/03/CS-Ventesimo-compleanno-Casina-Raffaello-13-14-15-marzo.pdf',
  ],
  cinema: [
    'https://it.wikipedia.org/wiki/Cinema_dei_Piccoli',
    'https://www.walksinsiderome.com/en/tour-attractions/cinema-dei-piccoli/',
  ],
  park: [
    'https://en.wikipedia.org/wiki/Villa_Borghese_gardens',
    'https://it.wikipedia.org/wiki/Villa_Borghese',
    'https://en.wikipedia.org/wiki/Stone_pine',
  ],
};

export function stopName(id, lang = 'en') { const c = CONTENT[id]; return c ? c.name[lang] || c.name.en : id; }
export function stopFacts(id, lang = 'en') { const c = CONTENT[id]; return c ? c.facts.map((f) => f[lang] || f.en) : []; }
export function parkFacts(lang = 'en') { return PARK_FACTS.map((f) => f[lang] || f.en); }
