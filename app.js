'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const dictionaries={en:'the of and to in is you that it he was for on are as with his they at be this have from or one had by word but not what all were we when your can said there use an each which she do how their if will up other about out many then them these so some her would make like him into time has look two more write go see number no way could people my than first water been call who oil its now find long down day did get come made may part quick brown fox jumps over lazy dog beautiful keyboard typing practice speed accuracy smooth focus learn create modern design competitive challenge world always never another little after before under above between around',de:'der die das und ist ein eine ich du wir sie er es nicht mit auf für von zu den dem des im am wie was auch noch aber oder wenn dann bei aus nach über unter sehr schon mehr hier dort heute morgen gestern zeit haus mensch kinder schreiben lesen schnell langsam wort wörter sprache tastatur übung lernen gut richtig falsch neue kleine große arbeit leben spielen fragen antworten',es:'el la los las de que y en un una es por con para como más pero sus le ya o fue este ha sí porque esta son entre cuando muy sin sobre también me hasta hay donde quien desde todo nos durante todos uno les ni contra otros ese eso ante ellos tiempo escribir rápido palabras teclado prueba velocidad mundo amigo',fr:'le la les de des un une et en est que pour dans qui sur pas plus par avec ce il elle nous vous ils elles être avoir comme mais ou où donc quand sans sous entre après avant tout très bien temps mots écrire vite clavier langue test vitesse précision monde maison bonjour',ru:'и в не на я что он она это как с по из у за от к мы вы они но да нет для его её их был есть будут когда где почему потому если только очень много мало быстро медленно слово слова текст писать печатать клавиатура скорость точность время тест язык русский мир человек дом школа игра работа новый хороший'};
// Original, language-specific practice passages grouped by actual length.
const quotes={"en":{"short":["Small steps can lead to great results.","Practice makes difficult things easier."],"medium":["Learning to type quickly takes patience and steady practice. Focus on accuracy first, then let your speed grow naturally as your hands become more familiar with the keyboard.","Every new skill begins with a few uncertain attempts. Keep practicing a little each day, notice your progress, and remember that improvement often arrives one small step at a time."],"long":["A good typing session is not just about reaching the highest possible number. It is about building a rhythm that feels comfortable and reliable. Start by reading the words ahead of your cursor, keep your hands relaxed, and try to make each keystroke deliberate. When you make a mistake, correct it calmly and continue. Over time, the combination of accuracy, patience, and regular practice can help you become a faster and more confident typist."]},"de":{"short":["Jeder Anfang braucht ein wenig Geduld.","Mit Übung wird vieles leichter."],"medium":["Wer schneller schreiben möchte, sollte zuerst auf Genauigkeit achten. Mit regelmäßiger Übung werden die Bewegungen sicherer, und nach und nach steigt auch die Geschwindigkeit beim Tippen.","Ein guter Tag beginnt oft mit einer kleinen Aufgabe. Wenn du dir Zeit nimmst und konzentriert arbeitest, kannst du jeden Tag etwas Neues lernen und besser werden."],"long":["Schnelles Tippen ist eine Fähigkeit, die sich mit der Zeit entwickelt. Am Anfang ist es wichtiger, die richtigen Tasten zu treffen, als möglichst schnell zu schreiben. Versuche, einen gleichmäßigen Rhythmus zu finden und die Wörter aufmerksam zu lesen. Wenn ein Fehler passiert, bleibe ruhig und verbessere ihn. Mit etwas Geduld und regelmäßiger Übung wirst du merken, dass deine Finger die Tasten immer sicherer finden und du längere Texte leichter schreiben kannst."]},"es":{"short":["Cada pequeño paso cuenta.","La práctica ayuda a mejorar cada día."],"medium":["Aprender a escribir rápido requiere tiempo y paciencia. Primero intenta escribir cada palabra correctamente y después aumenta la velocidad poco a poco, sin perder la concentración.","Una buena costumbre se construye con pequeñas acciones diarias. Cuando practicas con calma, puedes reconocer tus errores, aprender de ellos y avanzar hacia tus objetivos."],"long":["Escribir con rapidez no significa pulsar las teclas sin pensar. Lo más importante es mantener un ritmo constante y prestar atención a las palabras que aparecen en la pantalla. Al principio puedes cometer errores, pero eso forma parte del aprendizaje. Si practicas un poco cada día, tus manos recordarán mejor la posición de las teclas. Con el tiempo podrás escribir textos más largos con mayor confianza, precisión y velocidad."]},"fr":{"short":["Chaque petit effort compte.","La patience aide à progresser."],"medium":["Pour apprendre à taper plus vite, il faut commencer par écrire avec précision. Une pratique régulière permet de trouver un rythme agréable et de gagner progressivement en confiance.","Chaque journée offre une nouvelle occasion de progresser. Avec un peu de concentration et de patience, les gestes deviennent plus faciles et les erreurs moins fréquentes."],"long":["Apprendre à taper rapidement demande du temps et une attention régulière. Il vaut mieux commencer lentement et vérifier chaque mot plutôt que de chercher immédiatement une vitesse impressionnante. Lorsque vous faites une erreur, prenez le temps de la corriger et continuez tranquillement. Avec la pratique, vos doigts trouvent les bonnes touches plus facilement et votre rythme devient plus naturel. Le progrès vient souvent de petits efforts répétés chaque jour."]},"ru":{"short":["Каждый маленький шаг имеет значение.","Практика помогает становиться лучше."],"medium":["Чтобы научиться печатать быстрее, сначала нужно уделять внимание точности. Регулярные тренировки помогают запоминать расположение клавиш и постепенно находить удобный ритм работы.","Каждый новый навык требует терпения и времени. Если заниматься понемногу каждый день, можно заметить, как движения становятся увереннее, а ошибок появляется всё меньше."],"long":["Быстрая печать начинается не со скорости, а с внимательности и спокойной практики. Сначала старайся правильно набирать каждое слово и не торопись, когда встречаешь незнакомые сочетания букв. Если появляется ошибка, исправь её и продолжай в удобном темпе. Постепенно пальцы лучше запомнят расположение клавиш, а движения станут более плавными. Регулярные короткие занятия помогут писать длинные тексты увереннее, точнее и быстрее. Самое главное — замечать собственный прогресс и не бояться сложных заданий."]}};
// A fresh quote is available even when Tab is pressed on the long-quote setting.
quotes.en.long.push("When you learn something new, progress is rarely a straight line. Some days every word seems easy, while on other days even familiar letters feel difficult. The important thing is to keep going and pay attention to what improves. A steady pace, a clear goal, and regular practice can turn a challenging task into something that feels natural. Small successes are worth noticing because they add up over time.");
quotes.de.long.push("Neue Fähigkeiten entstehen nicht an einem einzigen Tag. Manchmal klappt eine Aufgabe sofort, und manchmal braucht man mehrere Versuche. Beim Tippen hilft es, ruhig zu bleiben und die Wörter genau anzusehen. Achte auf deinen Rhythmus und lass dich von kleinen Fehlern nicht ablenken. Wer regelmäßig übt, merkt nach einiger Zeit, dass auch schwierige Wörter einfacher werden. So wächst die Sicherheit Schritt für Schritt und ganz ohne unnötigen Druck.");
quotes.es.long.push("Cuando aprendemos una habilidad nueva, no siempre avanzamos al mismo ritmo. Hay días en los que todo parece sencillo y otros en los que cometemos errores inesperados. Al escribir, conviene mirar bien las palabras y mantener una velocidad cómoda. Una pausa breve puede ayudar a recuperar la concentración. Con práctica constante, los dedos encuentran las teclas con mayor facilidad y los textos largos dejan de parecer tan difíciles.");
quotes.fr.long.push("Apprendre une nouvelle compétence ne se fait pas en une seule journée. Certains exercices semblent faciles, tandis que d'autres demandent davantage de patience. Quand vous tapez un texte, essayez de garder un rythme agréable et de regarder les mots avec attention. Les petites erreurs font partie de l'entraînement. En pratiquant régulièrement, vous gagnerez peu à peu en aisance et pourrez écrire de longues phrases avec plus de confiance.");
quotes.ru.long.push("Любое новое умение развивается постепенно. Иногда знакомые слова печатаются легко, а иногда даже простое упражнение требует внимания. Старайся сохранять спокойный ритм и следить за буквами на экране. Если заметишь ошибку, исправь её и продолжай без спешки. Небольшие занятия каждый день помогают привыкнуть к клавиатуре и увереннее набирать длинные предложения. Со временем движения становятся точнее, а скорость растёт сама собой.");
const languageNames={en:'English',de:'Deutsch',es:'Español',fr:'Français',ru:'Русский',pt:'Português',it:'Italiano',nl:'Nederlands',pl:'Polski',uk:'Українська',tr:'Türkçe',ar:'العربية',hi:'हिन्दी',zh:'中文',ja:'日本語',ko:'한국어',sv:'Svenska',no:'Norsk',da:'Dansk',fi:'Suomi',cs:'Čeština',sk:'Slovenčina',hu:'Magyar',ro:'Română',bg:'Български',el:'Ελληνικά',he:'עברית',id:'Bahasa Indonesia',ms:'Bahasa Melayu',vi:'Tiếng Việt',th:'ไทย',fa:'فارسی',ur:'اردو',bn:'বাংলা',ta:'தமிழ்',te:'తెలుగు',mr:'मराठी',gu:'ગુજરાતી',pa:'ਪੰਜਾਬੀ',sw:'Kiswahili',af:'Afrikaans',sq:'Shqip',hy:'Հայերեն',az:'Azərbaycanca',eu:'Euskara',be:'Беларуская',bs:'Bosanski',ca:'Català',hr:'Hrvatski',et:'Eesti',fil:'Filipino',gl:'Galego',ka:'ქართული',is:'Íslenska',ga:'Gaeilge',kk:'Қазақша',km:'ខ្មែរ',lo:'ລາວ',lv:'Latviešu',lt:'Lietuvių',mk:'Македонски',mn:'Монгол',ne:'नेपाली',sr:'Српски',sl:'Slovenščina',so:'Soomaali',uz:'Oʻzbekcha',cy:'Cymraeg',yi:'ייִדיש',zu:'isiZulu'};
const extraBanks={pt:'de que e o a em um para é com não uma os no se na por mais as dos como mas foi ao ele das tem à seu sua ou ser quando muito há nos já está eu também só pelo pela até isso ela entre era depois sem mesmo aos ter seus quem nas me esse eles estão você tinha foram essa num nem suas meu às minha têm numa pelos elas havia seja qual será nós tenho lhe deles essas esses pelas este fosse dele tu te vocês vos lhes meus minhas teu tua teus tuas nosso nossa nossos nossas dela delas esta estes estas aquele aquela aqueles aquelas isto aquilo estou estamos estava estavam fui fomos sou somos',it:'il lo la i gli le di a da in con su per tra fra che non un una uno è sono come più ma anche si no io tu lui lei noi voi loro questo quello casa tempo parola parole scrivere velocità tastiera prova mondo amico bello nuovo sempre mai dopo prima dove quando perché molto poco',nl:'de het een en van ik je dat die in is niet op te zijn voor met als aan er maar om ook dan wat bij uit nog over naar heeft worden kunnen deze dit goed tijd woorden typen snelheid toetsenbord wereld mensen mooi',pl:'i w na z nie się to jest że do o a jak co ale po za od dla czy już tylko bardzo też ten ta tego być mieć czas słowa pisać szybko klawiatura świat człowiek dom szkoła dobry nowy',uk:'і в на не що це як він вона ми ви вони з до за від для але так ні коли де чому тому якщо дуже багато мало швидко повільно слово слова текст писати друкувати клавіатура швидкість точність час тест мова українська світ людина дім школа гра робота новий хороший',tr:'ve bir bu için ile de da ben sen o biz siz onlar çok ama daha gibi var yok ne nasıl neden zaman kelime yazmak hızlı klavye dünya insan ev okul oyun iş yeni güzel doğru yanlış',sv:'och det att som en på är av för med till den har inte om ett jag du vi ni de men var när hur varför ord skriva snabbt tangentbord värld människa hus skola tid bra',ja:'こんにちは 世界 文字 入力 練習 速度 正確 時間 今日 明日 昨日 学校 友達 仕事 言葉 文章 日本語 簡単 新しい 大きい 小さい 早い 遅い 美しい',ko:'안녕하세요 세계 문자 입력 연습 속도 정확 시간 오늘 내일 어제 학교 친구 일 단어 문장 한국어 쉬운 새로운 큰 작은 빠른 느린 아름다운',zh:'你好 世界 文字 输入 练习 速度 准确 时间 今天 明天 昨天 学校 朋友 工作 词语 文章 中文 简单 新的 大的 小的 快速 慢速 美丽'};
const additionalBanks={
 ar:'من في على إلى عن هذا هذه ذلك التي الذي كان يكون أنا أنت نحن هم مع عند بعد قبل اليوم غدا أمس وقت عمل مدرسة بيت كتاب لغة كلمة كلمات كتابة سرعة دقة اختبار العالم الناس جديد جميل صغير كبير كثير قليل',
 hi:'और यह वह मैं तुम हम आप लोग घर समय काम स्कूल किताब भाषा शब्द लिखना गति सही गलत नया पुराना अच्छा बड़ा छोटा दुनिया पानी दिन रात आज कल दोस्त खेल सीखना',
 fi:'ja on ei että se hän me te he minä sinä tämä tuo kanssa mutta myös aika sana sanat kirjoittaa nopeasti näppäimistö maailma ihminen talo koulu päivä yö uusi hyvä pieni suuri',
 da:'og det er en et jeg du vi de som ikke på til med for af har var den der men også ord skrive hurtigt tastatur verden menneske hus skole tid dag nat god ny',
 no:'og det er en et jeg du vi de som ikke på til med for av har var den der men også ord skrive raskt tastatur verden menneske hus skole tid dag natt god ny',
 cs:'a v na se je že do z pro jako ale nebo také tento tato to byl jsou být mít čas slovo slova psát rychle klávesnice svět člověk dům škola dobrý nový',
 sk:'a v na sa je že do z pre ako ale alebo tiež tento táto to bol sú byť mať čas slovo slová písať rýchlo klávesnica svet človek dom škola dobrý nový',
 hu:'és a az egy hogy nem van volt lesz én te ő mi ti ők ez az de vagy is mert mikor hol hogyan szó szavak írni gyors billentyűzet világ ember ház iskola idő jó új',
 ro:'și în de la cu pe este un o eu tu el ea noi voi ei ele dar pentru care când unde cum cuvânt cuvinte scrie repede tastatură lume om casă școală timp bun nou',
 bg:'и в на не е че за от до с по като но или това този тази аз ти той тя ние вие те време дума думи пиша бързо клавиатура свят човек дом училище нов добър',
 el:'και το η ο σε από με για δεν είναι που να θα εγώ εσύ αυτός αυτή εμείς εσείς αυτοί αλλά όταν πού πώς λέξη λέξεις γράφω γρήγορα πληκτρολόγιο κόσμος άνθρωπος σπίτι σχολείο χρόνος',
 he:'אני אתה את הוא היא אנחנו אתם הם זה זאת של על עם אל מן לא כן יש אין היה יהיה היום מחר אתמול זמן מילה מילים לכתוב מהר מקלדת עולם אדם בית ספר חדש טוב',
 id:'dan yang di ke dari untuk dengan ini itu adalah saya kamu dia kita mereka tidak ada bisa akan sudah tetapi karena waktu kata menulis cepat papan ketik dunia orang rumah sekolah baik baru',
 ms:'dan yang di ke dari untuk dengan ini itu adalah saya kamu dia kita mereka tidak ada boleh akan sudah tetapi kerana masa perkataan menulis cepat papan kekunci dunia orang rumah sekolah baik baru',
 vi:'và là của có không trong một những người tôi bạn chúng ta họ với cho từ đến khi như thế này đó thời gian từ ngữ viết nhanh bàn phím thế giới nhà trường học tốt mới',
 fa:'و در به از که این آن برای با من تو او ما شما آنها است بود خواهد یک دو سه روز شب زمان کلمه کلمات نوشتن سریع صفحه کلید جهان انسان خانه مدرسه خوب جدید',
 sw:'na ya kwa ni katika mimi wewe yeye sisi ninyi wao hii hiyo lakini pia sana wakati neno maneno kuandika haraka kibodi dunia mtu nyumba shule nzuri mpya kazi siku usiku',
 af:'en die is nie ek jy hy sy ons julle hulle van in op met vir as maar ook hierdie daardie tyd woord woorde tik vinnig sleutelbord wêreld mens huis skool goed nuut',
 ca:'i el la els les de que en un una és per amb com més però també jo tu nosaltres vosaltres ells temps paraula paraules escriure ràpid teclat món persona casa escola bo nou',
 hr:'i u na je da se za od do s po kao ali ili ovaj ova ovo ja ti on ona mi vi oni vrijeme riječ riječi pisati brzo tipkovnica svijet čovjek kuća škola dobro novo',
 sr:'и у на је да се за од до са по као али или овај ова ово ја ти он она ми ви они време реч речи писати брзо тастатура свет човек кућа школа добро ново',
 fil:'ang ng sa at ay mga ako ikaw siya kami tayo kayo sila ito iyon para mula may wala hindi oo oras salita mga salita sumulat mabilis tipahan mundo tao bahay paaralan bago maganda',
};
const bankKey=code=>'undefinedtype-bank-'+code;
function getBank(code){return (code==='en' ? dictionaries.en : (additionalBanks[code]||extraBanks[code]||dictionaries[code]||'')).trim();}
// The menu displays both the English and native language names and searches both.
const englishLanguageNames={en:'English',de:'German',es:'Spanish',fr:'French',ru:'Russian',pt:'Portuguese',it:'Italian',nl:'Dutch',pl:'Polish',uk:'Ukrainian',tr:'Turkish',ar:'Arabic',hi:'Hindi',zh:'Chinese',ja:'Japanese',ko:'Korean',sv:'Swedish',no:'Norwegian',da:'Danish',fi:'Finnish',cs:'Czech',sk:'Slovak',hu:'Hungarian',ro:'Romanian',bg:'Bulgarian',el:'Greek',he:'Hebrew',id:'Indonesian',ms:'Malay',vi:'Vietnamese',th:'Thai',fa:'Persian',ur:'Urdu',bn:'Bengali',ta:'Tamil',te:'Telugu',mr:'Marathi',gu:'Gujarati',pa:'Punjabi',sw:'Swahili',af:'Afrikaans',sq:'Albanian',hy:'Armenian',az:'Azerbaijani',eu:'Basque',be:'Belarusian',bs:'Bosnian',ca:'Catalan',hr:'Croatian',et:'Estonian',fil:'Filipino',gl:'Galician',ka:'Georgian',is:'Icelandic',ga:'Irish',kk:'Kazakh',km:'Khmer',lo:'Lao',lv:'Latvian',lt:'Lithuanian',mk:'Macedonian',mn:'Mongolian',ne:'Nepali',sr:'Serbian',sl:'Slovenian',so:'Somali',uz:'Uzbek',cy:'Welsh',yi:'Yiddish',zu:'Zulu'};
// Starter native-script word lists for languages not covered by the original banks.
// They are deliberately modest offline lists, not falsely advertised as full dictionaries.
const remainingBanks={
 th:'ฉัน คุณ เขา เธอ เรา พวกเรา บ้าน โรงเรียน เวลา วัน วันนี้ พรุ่งนี้ เมื่อวาน หนังสือ ภาษา คำ ข้อความ เขียน พิมพ์ แป้นพิมพ์ เร็ว ช้า ถูกต้อง สวย ดี ใหม่ โลก เพื่อน ครอบครัว งาน น้ำ อาหาร',
 ur:'میں تم آپ وہ یہ ہم ہمارا ان کا ایک دو تین ہے ہیں تھا تھے نہیں جی ہاں اور لیکن میں سے کو پر گھر کتاب زبان لفظ الفاظ لکھنا تیز وقت آج کل دوست دنیا اچھا نیا کام سکول',
 bn:'আমি তুমি আপনি সে আমরা তারা এটা ওটা ভালো নতুন পুরানো আজ কাল সময় দিন রাত কাজ স্কুল বাড়ি বই ভাষা শব্দ লেখা দ্রুত ধীরে সঠিক ভুল বন্ধু পৃথিবী মানুষ খাবার জল',
 ta:'நான் நீ நீங்கள் அவன் அவள் நாம் அவர்கள் இது அது ஒரு நல்ல புதிய பழைய இன்று நாளை நேற்று நேரம் நாள் இரவு வீடு பள்ளி புத்தகம் மொழி சொல் எழுத வேகம் வேலை உலகம் நண்பர் மனிதர்',
 te:'నేను నువ్వు మీరు అతను ఆమె మనం వారు ఇది అది ఒక మంచి కొత్త పాత ఈరోజు రేపు నిన్న సమయం రోజు రాత్రి ఇల్లు పాఠశాల పుస్తకం భాష పదం రాయడం వేగం పని ప్రపంచం స్నేహితుడు',
 mr:'मी तू तुम्ही तो ती आपण ते हे एक आणि पण नाही होय आज उद्या काल वेळ दिवस रात्र घर शाळा पुस्तक भाषा शब्द लिहिणे जलद हळू जग मित्र काम नवा चांगला',
 gu:'હું તું તમે તે આ અમે તેઓ અને પણ નથી છે હતો આજે કાલે ગઈકાલે સમય દિવસ રાત ઘર શાળા પુસ્તક ભાષા શબ્દ લખવું ઝડપી ધીમું દુનિયા મિત્ર કામ નવું સારું',
 pa:'ਮੈਂ ਤੂੰ ਤੁਸੀਂ ਉਹ ਇਹ ਅਸੀਂ ਉਹਨਾਂ ਅਤੇ ਪਰ ਨਹੀਂ ਹਾਂ ਹੈ ਸੀ ਅੱਜ ਕੱਲ੍ਹ ਸਮਾਂ ਦਿਨ ਰਾਤ ਘਰ ਸਕੂਲ ਕਿਤਾਬ ਭਾਸ਼ਾ ਸ਼ਬਦ ਲਿਖਣਾ ਤੇਜ਼ ਹੌਲੀ ਦੁਨੀਆ ਦੋਸਤ ਕੰਮ ਨਵਾਂ ਚੰਗਾ',
 sq:'unë ti ai ajo ne ju ata ato kjo ky është janë nuk dhe por për me nga në mbi sot nesër dje kohë ditë natë shtëpi shkollë libër gjuhë fjalë shkruaj shpejt mirë botë mik punë',
 hy:'ես դու նա մենք դուք նրանք սա դա և բայց ոչ այո է էր այսօր վաղը երեկ ժամանակ օր գիշեր տուն դպրոց գիրք լեզու բառ բառեր գրել արագ դանդաղ աշխարհ մարդ ընկեր աշխատանք նոր լավ',
 az:'mən sən o biz siz onlar bu bir və amma deyil var yox bugün sabah dünən vaxt gün gecə ev məktəb kitab dil söz sözlər yazmaq sürətli yavaş dünya insan dost iş yeni yaxşı',
 eu:'ni zu hura gu zuek haiek hau hori eta baina ez bai da dira izan egun gaur bihar atzo denbora gau etxe eskola liburu hizkuntza hitz idatzi azkar poliki mundu lagun lan berri on',
 be:'я ты ён яна мы вы яны гэта той тая і але не так ёсць быў сёння заўтра ўчора час дзень ноч дом школа кніга мова слова словы пісаць хутка павольна свет чалавек сябра праца новы добры',
 bs:'ja ti on ona mi vi oni one ovaj ova ovo i ali ili ne da jeste bio danas sutra jučer vrijeme dan noć kuća škola knjiga jezik riječ riječi pisati brzo sporo svijet prijatelj posao novo dobro',
 et:'mina sina tema meie teie nemad see need ja aga ei jah on oli täna homme eile aeg päev öö maja kool raamat keel sõna sõnad kirjutama kiiresti aeglaselt maailm sõber töö uus hea',
 gl:'eu ti el ela nós vós eles elas este esta iso e pero non si é son hoxe mañá onte tempo día noite casa escola libro lingua palabra palabras escribir rápido lento mundo amigo traballo novo bo',
 ka:'მე შენ ის ჩვენ თქვენ ისინი ეს და მაგრამ არა დიახ არის იყო დღეს ხვალ გუშინ დრო დღე ღამე სახლი სკოლა წიგნი ენა სიტყვა სიტყვები წერა სწრაფად ნელა მსოფლიო მეგობარი საქმე ახალი კარგი',
 is:'ég þú hann hún við þið þeir þær þetta og en ekki já er var í á með fyrir frá núna ídag morgun gær tími dagur nótt hús skóli bók tungumál orð skrifa hratt hægt heimur vinur vinna nýr góður',
 ga:'mé tú sé sí sinn sibh siad seo sin agus ach ní tá bhí inniu amárach inné am lá oíche teach scoil leabhar teanga focal focail scríobh tapa mall domhan cara obair nua maith',
 kk:'мен сен ол біз сіз олар бұл және бірақ жоқ иә бар еді бүгін ертең кеше уақыт күн түн үй мектеп кітап тіл сөз сөздер жазу жылдам баяу әлем адам дос жұмыс жаңа жақсы',
 km:'ខ្ញុំ អ្នក គាត់ នាង យើង ពួកគេ នេះ នោះ និង ប៉ុន្តែ មិន បាទ មាន ថ្ងៃនេះ ស្អែក ម្សិលមិញ ពេលវេលា ថ្ងៃ យប់ ផ្ទះ សាលា សៀវភៅ ភាសា ពាក្យ សរសេរ លឿន យឺត ពិភពលោក មិត្តភក្តិ ការងារ ល្អ',
 lo:'ຂ້ອຍ ເຈົ້າ ລາວ ພວກເຮົາ ພວກເຂົາ ນີ້ ນັ້ນ ແລະ ແຕ່ ບໍ່ ແມ່ນ ມີ ມື້ນີ້ ມື້ອື່ນ ມື້ວານ ເວລາ ມື້ ຄືນ ເຮືອນ ໂຮງຮຽນ ປຶ້ມ ພາສາ ຄຳ ຂຽນ ໄວ ຊ້າ ໂລກ ໝູ່ ວຽກ ດີ',
 lv:'es tu viņš viņa mēs jūs viņi viņas tas tā un bet ne jā ir bija šodien rīt vakar laiks diena nakts māja skola grāmata valoda vārds vārdi rakstīt ātri lēni pasaule draugs darbs jauns labs',
 lt:'aš tu jis ji mes jūs jie jos tai ir bet ne taip yra buvo šiandien rytoj vakar laikas diena naktis namas mokykla knyga kalba žodis žodžiai rašyti greitai lėtai pasaulis draugas darbas naujas geras',
 mk:'јас ти тој таа ние вие тие ова тоа и но не да е беше денес утре вчера време ден ноќ куќа училиште книга јазик збор зборови пишува брзо бавно свет човек пријател работа нов добро',
 mn:'би чи тэр бид та нар тэд энэ тэр болон гэхдээ үгүй тийм байна байсан өнөөдөр маргааш өчигдөр цаг өдөр шөнө гэр сургууль ном хэл үг үгс бичих хурдан удаан дэлхий найз ажил шинэ сайн',
 ne:'म तिमी तपाईं ऊ उनी हामी उनीहरू यो त्यो र तर होइन हो छ थियो आज भोलि हिजो समय दिन रात घर विद्यालय किताब भाषा शब्द शब्दहरू लेख्नु छिटो ढिलो संसार साथी काम नयाँ राम्रो',
 sl:'jaz ti on ona mi vi oni one to ta in ampak ne da je bil danes jutri včeraj čas dan noč hiša šola knjiga jezik beseda besede pisati hitro počasi svet prijatelj delo novo dobro',
 so:'aniga adiga isaga iyada annaga idinka iyaga kan tan iyo laakiin maya haa waa ahaa maanta berri shalay waqti maalin habeen guri dugsi buug luqad eray erayo qor degdeg tartiib adduun saaxiib shaqo cusub fiican',
 uz:'men sen u biz siz ular bu va lekin emas ha bor edi bugun ertaga kecha vaqt kun tun uy maktab kitob til soʻz soʻzlar yozish tez sekin dunyo doʻst ish yangi yaxshi',
 cy:'fi ti ef hi ni chi nhw hwn hon a ond nid ie mae roedd heddiw yfory ddoe amser dydd nos tŷ ysgol llyfr iaith gair geiriau ysgrifennu cyflym araf byd ffrind gwaith newydd da',
 yi:'איך דו ער זי מיר איר זיי דאָס יענער און אָבער נישט יאָ איז געווען הײַנט מאָרגן נעכטן צײַט טאָג נאַכט הויז שולע בוך שפּראַך וואָרט ווערטער שרײַבן שנעל פּאַמעלעך וועלט פֿרײַנד אַרבעט נײַ גוט',
 zu:'mina wena yena thina nina bona lokhu lokho futhi kodwa cha yebo kukhona namuhla kusasa izolo isikhathi usuku ubusuku indlu isikole incwadi ulimi igama amagama bhala ngokushesha kancane umhlaba umngane umsebenzi okusha kuhle'
};
for(const [code,bank] of Object.entries(remainingBanks))additionalBanks[code]=bank;
const normalizeSearch=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().trim();
let languageSearchResults=[];let focusedLanguageIndex=0;
function languageDisplay(code){return `${englishLanguageNames[code]||code} · ${languageNames[code]||code}`;}
function populateLanguageOptions(search=''){
 const list=$('#languageOptions');list.replaceChildren();const q=normalizeSearch(search);
 languageSearchResults=Object.keys(languageNames).filter(code=>normalizeSearch([englishLanguageNames[code],languageNames[code],code].join(' ')).includes(q)).sort((a,b)=>englishLanguageNames[a].localeCompare(englishLanguageNames[b]));
 focusedLanguageIndex=Math.max(0,Math.min(focusedLanguageIndex,languageSearchResults.length-1));
 $('#languageCount').textContent=`${languageSearchResults.length} of ${Object.keys(languageNames).length} languages`;
 if(!languageSearchResults.length){const empty=document.createElement('div');empty.className='language-empty';empty.textContent='No matching languages';list.append(empty);return;}
 languageSearchResults.forEach((code,i)=>{const option=document.createElement('button');option.type='button';option.className='language-option';option.setAttribute('role','option');option.setAttribute('aria-selected',String(code===lang));option.dataset.code=code;option.innerHTML='<span class="language-option-info"><span class="language-option-english"></span><span class="language-option-native"></span></span><span class="language-selected-symbol"></span>';option.querySelector('.language-option-english').textContent=englishLanguageNames[code];option.querySelector('.language-option-native').textContent=languageNames[code];option.querySelector('.language-selected-symbol').textContent=lang===code?'✓':'';if(i===focusedLanguageIndex)option.classList.add('highlighted');option.addEventListener('mouseover',()=>{focusedLanguageIndex=i;highlightLanguageOption();});option.addEventListener('click',()=>chooseLanguage(code));list.append(option);});
}
function highlightLanguageOption(){[...$$('.language-option')].forEach((el,i)=>el.classList.toggle('highlighted',i===focusedLanguageIndex));const el=$$('.language-option')[focusedLanguageIndex];el?.scrollIntoView({block:'nearest'});}
function showLanguageMenu(){const popup=$('#languagePopup');popup.classList.remove('hidden');$('#languageButton').setAttribute('aria-expanded','true');$('#languageSearch').value='';focusedLanguageIndex=0;populateLanguageOptions();$('#languageSearch').focus();}
function hideLanguageMenu(){const popup=$('#languagePopup');popup.classList.add('hidden');$('#languageButton').setAttribute('aria-expanded','false');}
function chooseLanguage(code){if(mode==='custom')return;lang=code;$('#selectedLanguage').textContent=languageDisplay(code);hideLanguageMenu();reset();}
function setupLanguages(){
 $('#selectedLanguage').textContent=languageDisplay(lang);
 $('#languageButton').addEventListener('click',()=>$('#languagePopup').classList.contains('hidden')?showLanguageMenu():hideLanguageMenu());
 $('#languageSearch').addEventListener('input',e=>{focusedLanguageIndex=0;populateLanguageOptions(e.target.value);});
 $('#languageSearch').addEventListener('keydown',e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(languageSearchResults.length){focusedLanguageIndex=(focusedLanguageIndex+(e.key==='ArrowDown'?1:-1)+languageSearchResults.length)%languageSearchResults.length;highlightLanguageOption();}}else if(e.key==='Enter'){e.preventDefault();if(languageSearchResults.length)chooseLanguage(languageSearchResults[focusedLanguageIndex]);}else if(e.key==='Escape'){e.preventDefault();hideLanguageMenu();$('#languageButton').focus();}});
 document.addEventListener('pointerdown',e=>{if(!$('#languageChooser').contains(e.target))hideLanguageMenu();});
}
function updateLanguageStatus(){
 const bank=getBank(lang),status=$('#languageStatus');
 status.textContent=mode!=='custom'&&!bank?'A word list is not available for this language.':'';
 status.classList.toggle('unavailable',!bank);
}

const lastQuote={};
const lengths={time:[15,30,60,120],words:[10,25,50,100],quote:['short','medium','long'],zen:['endless'],custom:['custom']};
const settings=JSON.parse(localStorage.getItem('undefinedtype-settings')||'{}');let mode='time',length=30,lang='en',punctuation=false,numbers=false,source='',typed='',startedAt=0,finished=false,started=false,timerId=null,history=[],events=[],audio=null,session=0,focusRequested=false;
const saveSettings=()=>localStorage.setItem('undefinedtype-settings',JSON.stringify(settings));
function randWord(){const a=getBank(lang).split(/\s+/).filter(Boolean);return a.length?a[Math.floor(Math.random()*a.length)]:'';}
// Generate words in batches so timed and Zen tests never run out of lines.
let generatedWords=0;
let renderedChars=[];
let currentLine=-1;
const rtlLanguages=new Set(['ar','he','fa','ur','yi']);
const shapedLanguages=new Set(['ar','he','fa','ur','yi','hi','bn','ta','te','mr','gu','pa','th','km','lo','ne']);
function makeWordBatch(count){
 const words=[];
 for(let i=0;i<count;i++){
  const position=generatedWords++;
  let word=randWord();
  if(punctuation){if(position%12===11)word+='.';else if(position%19===8)word+=',';}
  if(numbers&&position%13===7)word=String(10+Math.floor(Math.random()*90));
  words.push(word);
 }
 return words.join(' ');
}
let customApproved=false;
function makeText(){
 if(mode==='zen')return '';
 if(mode==='custom')return customApproved ? $('#customText').value.trim().replace(/\s+/gu,' ') : '';
 if(!getBank(lang))return '';
 if(mode==='quote'){
  const group=quotes[lang]?.[length];
  if(group?.length){const previous=lastQuote[lang+':'+length];const available=group.filter(text=>text!==previous);const pool=available.length?available:group;const chosen=pool[Math.floor(Math.random()*pool.length)];lastQuote[lang+':'+length]=chosen;return chosen;}
  // For additional languages, offer a language-native practice passage rather
  // than English filler. These are word exercises, not literary quotations.
  generatedWords=0;return makeWordBatch(length==='short'?11:length==='medium'?33:68)+'.';
 }
 generatedWords=0;
 if(mode==='time')return makeWordBatch(110)+' ';
 return makeWordBatch(Number(length));
}
// Construct a stable DOM once per test, then update only the characters being typed.
// Every word (including its following space) is an unbreakable inline-block.
function appendTokenNodes(text,startIndex){
 const fragment=document.createDocumentFragment();
 let index=startIndex;
 for(const token of (text.match(/\S+\s*|\s+/gu)||[])){
  const word=document.createElement('span');word.className='word';
  if(shapedLanguages.has(lang)){
   // Keep connected writing systems in a single text node, preserving shaping.
   // A collapsed DOM Range supplies the caret position for each input offset.
   const node=document.createTextNode(token);word.appendChild(node);
   word.dataset.start=String(index);word.dataset.end=String(index+token.length);
   for(let offset=0;offset<token.length;offset++)renderedChars.push({shaped:true,node,offset,word});
   index+=token.length;
  }else{
   for(const ch of Array.from(token)){
    const char=document.createElement('span');char.className='char';
    char.textContent=ch===' '?'\u00a0':ch;
    if(index<typed.length){
     char.classList.add(typed[index]===source[index]?'correct':'incorrect');
     if(ch===' '&&typed[index]!==' ')char.classList.add('space-error');
    }
    renderedChars.push(char);index+=ch.length;word.appendChild(char);
   }
  }
  fragment.appendChild(word);
 }
 $('#wordsDisplay').appendChild(fragment);
}
function renderText(){
 const display=$('#wordsDisplay');display.replaceChildren();display.classList.toggle('rtl',rtlLanguages.has(lang));renderedChars=[];currentLine=-1;
 if(!source){
  display.textContent=mode==='custom'?'Write your own text above, then choose start custom test.':'No word list for this language.';
  $('#cursor').style.display='none';return;
 }
 $('#cursor').style.display='block';
 appendTokenNodes(source,0);
 moveCursor();
}
function paintCharacter(index){
 const char=renderedChars[index];if(!char)return;
 if(char.shaped){
  const start=Number(char.word.dataset.start),end=Number(char.word.dataset.end);
  const written=typed.slice(start,Math.min(end,typed.length));
  const expected=source.slice(start,start+written.length);
  const wrong=written!==expected;
  char.word.classList.toggle('incorrect',wrong);
  char.word.classList.toggle('correct',!wrong&&typed.length>=end);
  return;
 }
 char.classList.remove('correct','incorrect','space-error');
 if(index<typed.length){
  char.classList.add(typed[index]===source[index]?'correct':'incorrect');
  if(source[index]===' '&&typed[index]!==' ')char.classList.add('space-error');
 }
}
function extendInfiniteText(){
 if(mode!=='time'||source.length-typed.length>220||!getBank(lang))return;
 const extra=makeWordBatch(100)+' ';
 const before=source.length;
 source+=extra;
 appendTokenNodes(extra,before);
}
function moveCursor(){
 const wrap=$('#typingWrap'),display=$('#wordsDisplay'),cursor=$('#cursor');
 if(!renderedChars.length)return;
 const target=renderedChars[Math.min(typed.length,renderedChars.length-1)];
 function targetRect(){if(!target.shaped)return target.getBoundingClientRect();const range=document.createRange();range.setStart(target.node,target.offset);range.collapse(true);return range.getBoundingClientRect();}
 const wrapRect=wrap.getBoundingClientRect();
 const firstRect=targetRect();
 const lineHeight=parseFloat(getComputedStyle(display).lineHeight)||49;
 const contentTop=firstRect.top-wrapRect.top+wrap.scrollTop;
 const line=Math.max(0,Math.round(contentTop/lineHeight));
 // When the next row starts, scroll the completed row away. The cursor then
 // appears at the left of the next row; it can continue doing so indefinitely.
 if(line!==currentLine){
  currentLine=line;
  wrap.scrollTop=line*lineHeight;
 }
 const rect=targetRect();
 const x=rect.left-wrapRect.left+(!target.shaped&&typed.length>=renderedChars.length?rect.width:0);
 // The cursor lives inside the scrolling container; its coordinate needs
 // the scroll offset ONCE, otherwise it jumps out of alignment after a wrap.
 const y=rect.top-wrapRect.top+wrap.scrollTop;
 cursor.style.transform=`translate3d(${x}px,${y}px,0)`;
 cursor.style.height=rect.height+'px';
}
function configure(){
 const el=$('#lengths');el.textContent='';lengths[mode].forEach(v=>{if(mode==='zen'||mode==='custom')return;const b=document.createElement('button');b.textContent=String(v);b.dataset.length=String(v);if(String(v)===String(length))b.className='selected';b.onclick=()=>{length=v;configure();reset();};el.appendChild(b);});
 $$('#modes button').forEach(b=>b.classList.toggle('selected',b.dataset.mode===mode));
 $('#customBox').classList.toggle('hidden',mode!=='custom');
 // Custom text comes entirely from the author; its language cannot be changed.
 if(mode==='custom')hideLanguageMenu();
 $('#languageChooser').classList.toggle('hidden',mode==='custom');
 // Zen displays only the word counter, never any clock.
 $('#liveStats').classList.toggle('zen-only',mode==='zen');
 $('#liveStats .timer').classList.toggle('hidden',mode==='zen');
 $('#punctuation').classList.toggle('selected',punctuation);$('#numbers').classList.toggle('selected',numbers);
 $('#timerLabel').textContent=mode==='time'?'time':'elapsed';
 $('#finishZen').classList.toggle('hidden',mode!=='zen');
 $('#zenCounter').classList.toggle('hidden',mode!=='zen');
 $('#typingWrap').classList.toggle('hidden',mode==='zen');
 $('#zenBox').classList.toggle('hidden',mode!=='zen');
 $('#testHint').innerHTML=mode==='zen'?'write anything · <kbd>shift</kbd> + <kbd>enter</kbd> finish · <kbd>tab</kbd> clear':mode==='custom'?'enter your own text first · <kbd>tab</kbd> restart':'type to begin · <kbd>tab</kbd> new text';
}
function focusTyping(){if(!$('#test').classList.contains('active'))return;const target=mode==='zen'?$('#zenInput'):mode==='custom'&&!customApproved?$('#customText'):$('#typeInput');target.focus({preventScroll:true});}
function countWords(text){
 if(!text.trim())return 0;
 if(typeof Intl.Segmenter==='function'){
  const segmenter=new Intl.Segmenter(lang,{granularity:'word'});
  let n=0;for(const segment of segmenter.segment(text)){if(segment.isWordLike)n++;}return n;
 }
 return (text.match(/[\p{L}\p{N}]+/gu)||[]).length;
}
function reset(){
 updateLanguageStatus();session++;clearInterval(timerId);
 source=makeText();typed='';startedAt=0;started=false;finished=false;history=[];events=[];
 $('#typingStage').classList.remove('hidden');$('#results').classList.add('hidden');
 $('#timer').textContent=mode==='time'?String(length):'0';
 $('#zenInput').value='';$('#zenWords').textContent='0';
 $('#typeInput').value='';$('#typingWrap').scrollTop=0;
 renderText();
 requestAnimationFrame(focusTyping);
}
function begin(){if(started)return;started=true;startedAt=performance.now();const mySession=session;timerId=setInterval(()=>{if(mySession!==session)return;updateStats();if(mode==='time'&&elapsed()>=Number(length))finish();},100);}
function elapsed(){return started?(performance.now()-startedAt)/1000:0;}
function metrics(){
 const seconds=Math.max(.001,elapsed());
 if(mode==='zen'){
  const value=$('#zenInput').value;
  const length=Array.from(value).length;
  const wpm=length/5/(seconds/60);
  const speeds=history.map(x=>x.wpm);
  let consistency=100;
  if(speeds.length>2){const avg=speeds.reduce((a,b)=>a+b,0)/speeds.length;const sd=Math.sqrt(speeds.reduce((a,b)=>a+(b-avg)**2,0)/speeds.length);consistency=Math.max(0,Math.min(100,100*(1-sd/Math.max(avg,1))));}
  return{wpm,raw:wpm,accuracy:null,consistency,correct:length,seconds,wordCount:countWords(value)};
 }
 let correct=0;for(let i=0;i<typed.length;i++)if(typed[i]===source[i])correct++;
 const inputs=events.filter(e=>e.type==='input'),correctEvents=inputs.filter(e=>e.correct).length;
 const accuracy=inputs.length?correctEvents/inputs.length*100:100;
 const wpm=correct/5/(seconds/60),raw=inputs.length/5/(seconds/60);
 const speeds=history.map(x=>x.wpm);let consistency=100;
 if(speeds.length>2){const avg=speeds.reduce((a,b)=>a+b,0)/speeds.length;const sd=Math.sqrt(speeds.reduce((a,b)=>a+(b-avg)**2,0)/speeds.length);consistency=Math.max(0,Math.min(100,100*(1-sd/Math.max(avg,1))));}
 return{wpm,raw,accuracy,consistency,correct,seconds};
}
function updateStats(){const m=metrics();$('#timer').textContent=mode==='time'?String(Math.max(0,Math.ceil(Number(length)-m.seconds))):String(Math.floor(m.seconds));if(mode==='zen')$('#zenWords').textContent=String(m.wordCount);const sec=Math.floor(m.seconds);if(started&&(!history.length||history[history.length-1].t!==sec))history.push({t:sec,wpm:m.wpm,accuracy:m.accuracy??100});}
function finish(){if(finished)return;updateStats();finished=true;clearInterval(timerId);const m=metrics();$('#typingStage').classList.add('hidden');$('#results').classList.remove('hidden');$('#results .eyebrow').textContent=mode==='zen'?`zen complete · ${m.wordCount} words`:'test complete';$('#finalWpm').textContent=Math.round(m.wpm);$('#finalAccuracy').textContent=m.accuracy===null?'free typing':Math.round(m.accuracy)+'%';$('#finalRaw').textContent=Math.round(m.raw);$('#finalConsistency').textContent=Math.round(m.consistency)+'%';drawGraph();if(mode!=='custom'&&mode!=='zen'&&m.seconds>1){const key=`${mode}:${length}:${lang}:${punctuation}:${numbers}`;const records=JSON.parse(localStorage.getItem('undefinedtype-records')||'{}');if(!records[key]||m.wpm>records[key].wpm){records[key]={wpm:m.wpm,accuracy:m.accuracy,date:new Date().toISOString(),mode,length,lang};localStorage.setItem('undefinedtype-records',JSON.stringify(records));}}}
function drawGraph(){const canvas=$('#graph'),ctx=canvas.getContext('2d');const dpr=Math.min(devicePixelRatio||1,2);canvas.width=950*dpr;canvas.height=200*dpr;ctx.scale(dpr,dpr);ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--panel').trim();ctx.fillRect(0,0,950,200);const points=history.length?history:[{t:0,wpm:0,accuracy:100}];const max=Math.max(40,...points.map(p=>p.wpm))*1.15;ctx.strokeStyle='#424447';ctx.lineWidth=1;for(let i=1;i<=3;i++){let y=180-i*45;ctx.beginPath();ctx.moveTo(30,y);ctx.lineTo(930,y);ctx.stroke();}function line(field,color,scale){ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=2.5;points.forEach((p,i)=>{const x=30+i/Math.max(1,points.length-1)*900,y=180-p[field]/scale*150;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.stroke();}line('wpm',getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),max);line('accuracy','#6b9eac',100);ctx.font='12px monospace';ctx.fillStyle='#929698';ctx.fillText('WPM',35,20);ctx.fillStyle='#6b9eac';ctx.fillText('accuracy',100,20);}
function beep(){if(!$('#sound').checked)return;try{audio=audio||new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.value=440+Math.random()*70;gain.gain.setValueAtTime(.015,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.035);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+.035);}catch{}}
let composing=false;let lastCommittedComposition=null;
function setCapsState(e){
 const caps=!!(e.getModifierState?.('CapsLock'));
 $('#capsNotice').classList.toggle('hidden',!caps||!$('#test').classList.contains('active'));
}
function pushText(text){
 if(!source||finished||mode==='zen')return;
 if(!started)begin();
 for(const ch of Array.from(text)){
  extendInfiniteText();if(typed.length>=source.length)break;
  if($('#correction').checked&&typed.length&&typed[typed.length-1]!==source[typed.length-1])break;
  const expected=source[typed.length];events.push({type:'input',correct:ch===expected});typed+=ch;
  paintCharacter(typed.length-1);
  if(typed.length>=source.length&&mode!=='time'){moveCursor();updateStats();finish();break;}
 }
 extendInfiniteText();moveCursor();updateStats();beep();
}
function input(e){
 if(!$('#test').classList.contains('active'))return;
 setCapsState(e);
 const editing=e.target?.isContentEditable||(['TEXTAREA','INPUT','SELECT'].includes(e.target?.tagName)&&e.target?.id!=='typeInput'&&e.target?.id!=='zenInput');
 if(!$('#languagePopup').classList.contains('hidden'))return;
 if(e.key==='Tab'&&!e.shiftKey&&!editing&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();if(!e.repeat)reset();return;}
 // Escape does not reset typing tests.
 if(e.key==='Escape'||finished||editing||e.ctrlKey||e.metaKey||e.altKey||composing)return;
 if(mode==='zen')return; // native textarea input handles Zen text
 if(!source)return;
 if(e.key==='Backspace'){
  e.preventDefault();
  if(typed.length){typed=typed.slice(0,-1);events.push({type:'backspace'});paintCharacter(typed.length);moveCursor();updateStats();}
  return;
 }
 if(e.key.length!==1)return;
 e.preventDefault();pushText(e.key==='\u00a0'?' ':e.key);
}

function showPage(name){$$('.page').forEach(p=>p.classList.toggle('active',p.id===name));$$('.nav').forEach(b=>b.classList.toggle('active',b.dataset.page===name));if(name==='leaderboards')showRecords();if(name==='test')requestAnimationFrame(focusTyping);}
function showRecords(){const records=Object.values(JSON.parse(localStorage.getItem('undefinedtype-records')||'{}')).filter(r=>r.mode===$('#recordMode').value).sort((a,b)=>b.wpm-a.wpm);const el=$('#records');el.textContent='';if(!records.length){el.innerHTML='<div class="empty">no records yet · finish a typing test to set one</div>';return;}records.forEach((r,i)=>{const row=document.createElement('div');row.className='record-row';const name=document.createElement('span');name.textContent=`#${i+1} · ${r.length}${r.mode==='time'?'s':' words'} · ${r.lang}`;const val=document.createElement('strong');val.textContent=`${Math.round(r.wpm)} wpm · ${Math.round(r.accuracy)}%`;row.append(name,val);el.appendChild(row);});}
function share(){const c=document.createElement('canvas');c.width=1100;c.height=580;const x=c.getContext('2d');x.fillStyle='#181a1b';x.fillRect(0,0,1100,580);x.fillStyle='#e2b714';x.font='bold 50px monospace';x.fillText('undefinedtype',75,100);x.fillStyle='#8a8e8f';x.font='24px monospace';x.fillText('typing test result',75,155);x.fillStyle='#e2b714';x.font='bold 130px monospace';x.fillText($('#finalWpm').textContent,75,345);x.font='28px monospace';x.fillText('WPM',85,395);x.fillStyle='#ddd';x.font='40px monospace';x.fillText($('#finalAccuracy').textContent+' accuracy',430,325);x.fillText($('#finalConsistency').textContent+' consistency',430,390);x.fillStyle='#777';x.font='20px monospace';x.fillText(`${mode} · ${length} · ${lang}`,75,500);const link=document.createElement('a');link.download='undefinedtype-result.png';link.href=c.toDataURL('image/png');link.click();}
$$('.nav').forEach(b=>b.onclick=()=>showPage(b.dataset.page));$('#home').onclick=e=>{e.preventDefault();showPage('test');};$$('#modes button').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;length=lengths[mode][mode==='time'?1:0];customApproved=false;configure();reset();});$('#punctuation').onclick=()=>{punctuation=!punctuation;configure();reset();};$('#numbers').onclick=()=>{numbers=!numbers;configure();reset();};
$('#applyCustom').onclick=()=>{if(!$('#customText').value.trim())return;customApproved=true;reset();};$('#customText').addEventListener('input',()=>{$('#applyCustom').disabled=!$('#customText').value.trim();$('#customCounter').textContent=Array.from($('#customText').value).length+' characters';customApproved=false;if(source||started)reset();});$('#restart').onclick=()=>reset();$('#finishZen').onclick=()=>{if(started&&!finished)finish();};$('#again').onclick=()=>reset();$('#share').onclick=share;$('#recordMode').onchange=showRecords;$('#typingWrap').onclick=focusTyping;$('#typeInput').addEventListener('compositionstart',()=>{composing=true;});$('#typeInput').addEventListener('compositionend',e=>{composing=false;lastCommittedComposition=e.data||'';$('#typeInput').value='';pushText(lastCommittedComposition);});$('#typeInput').addEventListener('input',e=>{if(!composing&&e.data&&!e.isComposing){if(e.data!==lastCommittedComposition){pushText(e.data);}lastCommittedComposition=null;}$('#typeInput').value='';});$('#zenInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.shiftKey){e.preventDefault();e.stopPropagation();if(started&&!finished)finish();} });$('#zenInput').addEventListener('input',()=>{if(mode!=='zen'||finished)return;if(!started&&$('#zenInput').value.length)begin();updateStats();});document.addEventListener('keydown',input);document.addEventListener('keyup',setCapsState);window.addEventListener('blur',()=>$('#capsNotice').classList.add('hidden'));$('#sound').checked=settings.sound!==false;$('#correction').checked=!!settings.correction;$('#accent').value=settings.accent||'#e2b714';$('#background').value=settings.background||'#181a1b';function theme(){document.documentElement.style.setProperty('--accent',$('#accent').value);document.documentElement.style.setProperty('--bg',$('#background').value);}theme();$('#sound').onchange=()=>{settings.sound=$('#sound').checked;saveSettings();};$('#correction').onchange=()=>{settings.correction=$('#correction').checked;saveSettings();};$('#accent').oninput=()=>{settings.accent=$('#accent').value;theme();saveSettings();};$('#background').oninput=()=>{settings.background=$('#background').value;theme();saveSettings();};$('#resetTheme').onclick=()=>{$('#accent').value='#e2b714';$('#background').value='#181a1b';settings.accent='#e2b714';settings.background='#181a1b';theme();saveSettings();};setupLanguages();lang='en';$('#selectedLanguage').textContent=languageDisplay('en');configure();reset();
