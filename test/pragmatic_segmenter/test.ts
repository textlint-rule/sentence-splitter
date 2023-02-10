/**
 * Source:
 * https://github.com/diasks2/pragmatic_segmenter
 */
export const source = [
    // Golden Rules (English)

    {
        name: "Simple period to end sentence",
        input: "Hello World. My name is Jonas.",
        output: ["Hello World.", "My name is Jonas."]
    },

    {
        name: "Question mark to end sentence",
        input: "What is your name? My name is Jonas.",
        output: ["What is your name?", "My name is Jonas."]
    },

    {
        name: "Exclamation point to end sentence",
        input: "There it is! I found it.",
        output: ["There it is!", "I found it."]
    },

    {
        name: "One letter upper case abbreviations",
        input: "My name is Jonas E. Smith.",
        output: ["My name is Jonas E. Smith."],
        skip: true
    },

    {
        name: "One letter lower case abbreviations",
        input: "Please turn to p. 55.",
        output: ["Please turn to p. 55."]
    },

    {
        name: "Two letter lower case abbreviations in the middle of a sentence",
        input: "Were Jane and co. at the party?",
        output: ["Were Jane and co. at the party?"]
    },

    {
        name: "Two letter upper case abbreviations in the middle of a sentence",
        input: "They closed the deal with Pitt, Briggs & Co. at noon.",
        output: ["They closed the deal with Pitt, Briggs & Co. at noon."]
    },

    {
        name: "Two letter lower case abbreviations at the end of a sentence",
        input: "Let's ask Jane and co. They should know.",
        output: ["Let's ask Jane and co.", "They should know."],
        skip: true
    },

    {
        name: "Two letter upper case abbreviations at the end of a sentence",
        input: "They closed the deal with Pitt, Briggs & Co. It closed yesterday.",
        output: ["They closed the deal with Pitt, Briggs & Co.", "It closed yesterday."]
    },

    {
        name: "Two letter (prepositive) abbreviations",
        input: "I can see Mt. Fuji from here.",
        output: ["I can see Mt. Fuji from here."]
    },

    {
        name: "Two letter (prepositive & postpositive) abbreviations",
        input: "St. Michael's Church is on 5th st. near the light.",
        output: ["St. Michael's Church is on 5th st. near the light."]
    },

    {
        name: "Possesive two letter abbreviations",
        input: "That is JFK Jr.'s book.",
        output: ["That is JFK Jr.'s book."]
    },

    {
        name: "Multi-period abbreviations in the middle of a sentence",
        input: "I visited the U.S.A. last year.",
        output: ["I visited the U.S.A. last year."]
    },

    {
        name: "Multi-period abbreviations at the end of a sentence",
        input: "I live in the E.U. How about you?",
        output: ["I live in the E.U.", "How about you?"]
    },

    {
        name: "U.S. as sentence boundary",
        input: "I live in the U.S. How about you?",
        output: ["I live in the U.S.", "How about you?"]
    },

    {
        name: "U.S. as non sentence boundary with next word capitalized",
        input: "I work for the U.S. Government in Virginia.",
        output: ["I work for the U.S. Government in Virginia."],
        skip: true // prefer to next
    },

    {
        name: "U.S. as non sentence boundary",
        input: "I have lived in the U.S. for 20 years.",
        output: ["I have lived in the U.S. for 20 years."]
    },

    {
        name: "A.M. / P.M. as non sentence boundary and sentence boundary",
        input: "At 5 a.m. Mr. Smith went to the bank. He left the bank at 6 P.M. Mr. Smith then went to the store.",
        output: [
            "At 5 a.m. Mr. Smith went to the bank.",
            "He left the bank at 6 P.M.",
            "Mr. Smith then went to the store."
        ],
        skip: true
    },

    {
        name: "Number as non sentence boundary",
        input: "She has $100.00 in her bag.",
        output: ["She has $100.00 in her bag."]
    },

    {
        name: "Number as sentence boundary",
        input: "She has $100.00. It is in her bag.",
        output: ["She has $100.00.", "It is in her bag."]
    },

    {
        name: "Parenthetical inside sentence",
        input: "He teaches science (He previously worked for 5 years as an engineer.) at the local University.",
        output: ["He teaches science (He previously worked for 5 years as an engineer.) at the local University."]
    },

    {
        name: "Email addresses",
        input: "Her email is Jane.Doe@example.com. I sent her an email.",
        output: ["Her email is Jane.Doe@example.com.", "I sent her an email."]
    },

    {
        name: "Web addresses",
        input: "The site is: https://www.example.50.com/new-site/awesome_content.html. Please check it out.",
        output: ["The site is: https://www.example.50.com/new-site/awesome_content.html.", "Please check it out."]
    },

    {
        name: "Single quotations inside sentence",
        input: "She turned to him, 'This is great.' she said.",
        output: ["She turned to him, 'This is great.' she said."]
    },

    {
        name: "Double quotations inside sentence",
        input: 'She turned to him, "This is great." she said.',
        output: ['She turned to him, "This is great." she said.']
    },

    {
        name: "Double quotations at the end of a sentence",
        input: 'She turned to him, "This is great." She held the book out to show him.',
        output: ['She turned to him, "This is great."', "She held the book out to show him."],
        skip: true
    },

    {
        name: "Double punctuation (exclamation point)",
        input: "Hello!! Long time no see.",
        output: ["Hello!!", "Long time no see."]
    },

    {
        name: "Double punctuation (question mark)",
        input: "Hello?? Who is there?",
        output: ["Hello??", "Who is there?"]
    },

    {
        name: "Double punctuation (exclamation point / question mark)",
        input: "Hello!? Is that you?",
        output: ["Hello!?", "Is that you?"]
    },

    {
        name: "Double punctuation (question mark / exclamation point)",
        input: "Hello?! Is that you?",
        output: ["Hello?!", "Is that you?"]
    },

    {
        name: "List (period followed by parens and no period to end item)",
        input: "1.) The first item 2.) The second item",
        output: ["1.) The first item", "2.) The second item"],
        skip: true
    },

    {
        name: "List (period followed by parens and period to end item)",
        input: "1.) The first item. 2.) The second item.",
        output: ["1.) The first item.", "2.) The second item."],
        skip: true
    },

    {
        name: "List (parens and no period to end item)",
        input: "1) The first item 2) The second item",
        output: ["1) The first item", "2) The second item"],
        skip: true
    },

    {
        name: "List (parens and period to end item)",
        input: "1) The first item. 2) The second item.",
        output: ["1) The first item.", "2) The second item."],
        skip: true
    },

    {
        name: "List (period to mark list and no period to end item)",
        input: "1. The first item 2. The second item",
        output: ["1. The first item", "2. The second item"],
        skip: true
    },

    {
        name: "List (period to mark list and period to end item)",
        input: "1. The first item. 2. The second item.",
        output: ["1. The first item.", "2. The second item."],
        skip: true
    },

    {
        name: "List with bullet",
        input: "• 9. The first item • 10. The second item",
        output: ["• 9. The first item", "• 10. The second item"],
        skip: true
    },

    {
        name: "List with hypthen",
        input: "⁃9. The first item ⁃10. The second item",
        output: ["⁃9. The first item", "⁃10. The second item"],
        skip: true
    },

    {
        name: "Alphabetical list",
        input: "a. The first item b. The second item c. The third list item",
        output: ["a. The first item", "b. The second item", "c. The third list item"],
        skip: true
    },

    {
        name: "Errant newlines in the middle of sentences (PDF)",
        input: "This is a sentence\ncut off in the middle because pdf.",
        output: ["This is a sentence cut off in the middle because pdf."],
        skip: true
    },

    {
        name: "Errant newlines in the middle of sentences",
        input: "It was a cold \nnight in the city.",
        output: ["It was a cold night in the city."],
        skip: true
    },

    {
        name: "Lower case list separated by newline",
        input: "features\ncontact manager\nevents, activities\n",
        output: ["features", "contact manager", "events, activities"],
        skip: true
    },

    {
        name: "Geo Coordinates",
        input: "You can find it at N°. 1026.253.553. That is where the treasure is.",
        output: ["You can find it at N°. 1026.253.553.", "That is where the treasure is."],
        skip: true
    },

    {
        name: "Named entities with an exclamation point",
        input: "She works at Yahoo! in the accounting department.",
        output: ["She works at Yahoo! in the accounting department."]
    },

    {
        name: "I as a sentence boundary and I as an abbreviation",
        input: "We make a good team, you and I. Did you see Albert I. Jones yesterday?",
        output: ["We make a good team, you and I.", "Did you see Albert I. Jones yesterday?"]
    },

    {
        name: "Ellipsis at end of quotation",
        input: "Thoreau argues that by simplifying one’s life, “the laws of the universe will appear less complex. . . .”",
        output: [
            "Thoreau argues that by simplifying one’s life, “the laws of the universe will appear less complex. . . .”"
        ],
        skip: true
    },

    {
        name: "Ellipsis with square brackets",
        input: '"Bohr [...] used the analogy of parallel stairways [...]" (Smith 55).',
        output: ['"Bohr [...] used the analogy of parallel stairways [...]" (Smith 55).']
    },

    {
        name: "Ellipsis as sentence boundary (standard ellipsis rules)",
        input: "If words are left off at the end of a sentence, and that is all that is omitted, indicate the omission with ellipsis marks (preceded and followed by a space) and then indicate the end of the sentence with a period . . . . Next sentence.",
        output: [
            "If words are left off at the end of a sentence, and that is all that is omitted, indicate the omission with ellipsis marks (preceded and followed by a space) and then indicate the end of the sentence with a period . . . .",
            "Next sentence."
        ],
        skip: true
    },

    {
        name: "Ellipsis as sentence boundary (non-standard ellipsis rules)",
        input: "I never meant that.... She left the store.",
        output: ["I never meant that....", "She left the store."]
    },

    {
        name: "Ellipsis as non sentence boundary",
        input: "I wasn’t really ... well, what I mean...see . . . what I'm saying, the thing is . . . I didn’t mean it.",
        output: [
            "I wasn’t really ... well, what I mean...see . . . what I'm saying, the thing is . . . I didn’t mean it."
        ],
        skip: true
    },

    {
        name: "4-dot ellipsis",
        input: "One further habit which was somewhat weakened . . . was that of combining words into self-interpreting compounds. . . . The practice was not abandoned. . . .",
        output: [
            "One further habit which was somewhat weakened . . . was that of combining words into self-interpreting compounds.",
            ". . . The practice was not abandoned. . . ."
        ],
        skip: true
    },

    // Golden Rules (German)

    {
        name: "Quotation at end of sentence",
        input: "„Ich habe heute keine Zeit“, sagte die Frau und flüsterte leise: „Und auch keine Lust.“ Wir haben 1.000.000 Euro.",
        output: [
            "„Ich habe heute keine Zeit“, sagte die Frau und flüsterte leise: „Und auch keine Lust.“",
            "Wir haben 1.000.000 Euro."
        ],
        skip: true
    },

    {
        name: "Abbreviations",
        input: "Es gibt jedoch einige Vorsichtsmaßnahmen, die Du ergreifen kannst, z. B. ist es sehr empfehlenswert, dass Du Dein Zuhause von allem Junkfood befreist.",
        output: [
            "Es gibt jedoch einige Vorsichtsmaßnahmen, die Du ergreifen kannst, z. B. ist es sehr empfehlenswert, dass Du Dein Zuhause von allem Junkfood befreist."
        ],
        skip: true
    },

    {
        name: "Numbers",
        input: "Was sind die Konsequenzen der Abstimmung vom 12. Juni?",
        output: ["Was sind die Konsequenzen der Abstimmung vom 12. Juni?"],
        skip: true
    },

    // Golden Rules (Japanese)

    {
        name: "Simple period to end sentence",
        input: "これはペンです。それはマーカーです。",
        output: ["これはペンです。", "それはマーカーです。"]
    },

    {
        name: "Question mark to end sentence",
        input: "それは何ですか？ペンですか？",
        output: ["それは何ですか？", "ペンですか？"]
    },

    {
        name: "Exclamation point to end sentence",
        input: "良かったね！すごい！",
        output: ["良かったね！", "すごい！"]
    },

    {
        name: "Quotation",
        input: "自民党税制調査会の幹部は、「引き下げ幅は３．２９％以上を目指すことになる」と指摘していて、今後、公明党と合意したうえで、３０日に決定する与党税制改正大綱に盛り込むことにしています。２％台後半を目指すとする方向で最終調整に入りました。",
        output: [
            "自民党税制調査会の幹部は、「引き下げ幅は３．２９％以上を目指すことになる」と指摘していて、今後、公明党と合意したうえで、３０日に決定する与党税制改正大綱に盛り込むことにしています。",
            "２％台後半を目指すとする方向で最終調整に入りました。"
        ]
    },

    {
        name: "Guillemet",
        input: "《響け！ユーフォニアム》は京都アニメーションの有名作品です。",
        output: ["《響け！ユーフォニアム》は京都アニメーションの有名作品です。"]
    },

    {
        name: "Errant newlines in the middle of sentences",
        input: "これは父の\n家です。",
        output: ["これは父の家です。"],
        skip: true
    },

    // Golden Rules (Arabic)

    {
        name: "Regular punctuation",
        input: "سؤال وجواب: ماذا حدث بعد الانتخابات الايرانية؟ طرح الكثير من التساؤلات غداة ظهور نتائج الانتخابات الرئاسية الايرانية التي أججت مظاهرات واسعة واعمال عنف بين المحتجين على النتائج ورجال الامن. يقول معارضو الرئيس الإيراني إن الطريقة التي اعلنت بها النتائج كانت مثيرة للاستغراب.",
        output: [
            "سؤال وجواب:",
            "ماذا حدث بعد الانتخابات الايرانية؟",
            "طرح الكثير من التساؤلات غداة ظهور نتائج الانتخابات الرئاسية الايرانية التي أججت مظاهرات واسعة واعمال عنف بين المحتجين على النتائج ورجال الامن.",
            "يقول معارضو الرئيس الإيراني إن الطريقة التي اعلنت بها النتائج كانت مثيرة للاستغراب."
        ],
        skip: true
    },

    {
        name: "Abbreviations",
        input: "وقال د‪.‬ ديفيد ريدي و الأطباء الذين كانوا يعالجونها في مستشفى برمنجهام إنها كانت تعاني من أمراض أخرى. وليس معروفا ما اذا كانت قد توفيت بسبب اصابتها بأنفلونزا الخنازير.",
        output: [
            "وقال د‪.‬ ديفيد ريدي و الأطباء الذين كانوا يعالجونها في مستشفى برمنجهام إنها كانت تعاني من أمراض أخرى.",
            "وليس معروفا ما اذا كانت قد توفيت بسبب اصابتها بأنفلونزا الخنازير."
        ]
    },

    {
        name: "Numbers and Dates",
        input: "ومن المنتظر أن يكتمل مشروع خط أنابيب نابوكو البالغ طوله 3300 كليومترا في 12‪/‬08‪/‬2014 بتكلفة تُقدر بـ 7.9 مليارات يورو أي نحو 10.9 مليارات دولار. ومن المقرر أن تصل طاقة ضخ الغاز في المشروع 31 مليار متر مكعب انطلاقا من بحر قزوين مرورا بالنمسا وتركيا ودول البلقان دون المرور على الأراضي الروسية.",
        output: [
            "ومن المنتظر أن يكتمل مشروع خط أنابيب نابوكو البالغ طوله 3300 كليومترا في 12‪/‬08‪/‬2014 بتكلفة تُقدر بـ 7.9 مليارات يورو أي نحو 10.9 مليارات دولار.",
            "ومن المقرر أن تصل طاقة ضخ الغاز في المشروع 31 مليار متر مكعب انطلاقا من بحر قزوين مرورا بالنمسا وتركيا ودول البلقان دون المرور على الأراضي الروسية."
        ]
    },

    {
        name: "Time",
        input: "الاحد, 21 فبراير/ شباط, 2010, 05:01 GMT الصنداي تايمز: رئيس الموساد قد يصبح ضحية الحرب السرية التي شتنها بنفسه. العقل المنظم هو مئير داجان رئيس الموساد الإسرائيلي الذي يشتبه بقيامه باغتيال القائد الفلسطيني في حركة حماس محمود المبحوح في دبي.",
        output: [
            "الاحد, 21 فبراير/ شباط, 2010, 05:01 GMT الصنداي تايمز:",
            "رئيس الموساد قد يصبح ضحية الحرب السرية التي شتنها بنفسه.",
            "العقل المنظم هو مئير داجان رئيس الموساد الإسرائيلي الذي يشتبه بقيامه باغتيال القائد الفلسطيني في حركة حماس محمود المبحوح في دبي."
        ],
        skip: true
    },

    {
        name: "Comma",
        input: "عثر في الغرفة على بعض أدوية علاج ارتفاع ضغط الدم، والقلب، زرعها عملاء الموساد كما تقول مصادر إسرائيلية، وقرر الطبيب أن الفلسطيني قد توفي وفاة طبيعية ربما إثر نوبة قلبية، وبدأت مراسم الحداد عليه",
        output: [
            "عثر في الغرفة على بعض أدوية علاج ارتفاع ضغط الدم، والقلب،",
            "زرعها عملاء الموساد كما تقول مصادر إسرائيلية،",
            "وقرر الطبيب أن الفلسطيني قد توفي وفاة طبيعية ربما إثر نوبة قلبية،",
            "وبدأت مراسم الحداد عليه"
        ],
        skip: true
    },

    // Golden Rules (Italian)

    {
        name: "Abbreviations",
        input: "Salve Sig.ra Mengoni! Come sta oggi?",
        output: ["Salve Sig.ra Mengoni!", "Come sta oggi?"]
    },

    {
        name: "Quotations",
        input: "Una lettera si può iniziare in questo modo «Il/la sottoscritto/a.».",
        output: ["Una lettera si può iniziare in questo modo «Il/la sottoscritto/a.»."]
    },

    {
        name: "Numbers",
        input: "La casa costa 170.500.000,00€!",
        output: ["La casa costa 170.500.000,00€!"]
    },

    // Golden Rules (Russian)

    {
        name: "Abbreviations",
        input: "Объем составляет 5 куб.м.",
        output: ["Объем составляет 5 куб.м."]
    },

    {
        name: "Quotations",
        input: "Маленькая девочка бежала и кричала: «Не видали маму?».",
        output: ["Маленькая девочка бежала и кричала: «Не видали маму?»."],
        skip: true
    },

    {
        name: "Numbers",
        input: "Сегодня 27.10.14",
        output: ["Сегодня 27.10.14"]
    },

    // Golden Rules (Spanish)

    {
        name: "Question mark to end sentence",
        input: "¿Cómo está hoy? Espero que muy bien.",
        output: ["¿Cómo está hoy?", "Espero que muy bien."]
    },

    {
        name: "Exclamation point to end sentence",
        input: "¡Hola señorita! Espero que muy bien.",
        output: ["¡Hola señorita!", "Espero que muy bien."]
    },

    {
        name: "Abbreviations",
        input: "Hola Srta. Ledesma. Buenos días, soy el Lic. Naser Pastoriza, y él es mi padre, el Dr. Naser.",
        output: ["Hola Srta. Ledesma.", "Buenos días, soy el Lic. Naser Pastoriza, y él es mi padre, el Dr. Naser."],
        skip: true
    },

    {
        name: "Numbers",
        input: "¡La casa cuesta $170.500.000,00! ¡Muy costosa! Se prevé una disminución del 12.5% para el próximo año.",
        output: [
            "¡La casa cuesta $170.500.000,00!",
            "¡Muy costosa!",
            "Se prevé una disminución del 12.5% para el próximo año."
        ],
        skip: true
    },

    {
        name: "Quotations",
        input: "«Ninguna mente extraordinaria está exenta de un toque de demencia.», dijo Aristóteles.",
        output: ["«Ninguna mente extraordinaria está exenta de un toque de demencia.», dijo Aristóteles."],
        skip: true
    },

    // Golden Rules (Greek)

    {
        name: "Question mark to end sentence",
        input: "Με συγχωρείτε· πού είναι οι τουαλέτες; Τις Κυριακές δε δούλευε κανένας. το κόστος του σπιτιού ήταν £260.950,00.",
        output: [
            "Με συγχωρείτε· πού είναι οι τουαλέτες;",
            "Τις Κυριακές δε δούλευε κανένας.",
            "το κόστος του σπιτιού ήταν £260.950,00."
        ],
        skip: true
    },

    // Golden Rules (Hindi)

    {
        name: "Full stop",
        input: "सच्चाई यह है कि इसे कोई नहीं जानता। हो सकता है यह फ़्रेन्को के खिलाफ़ कोई विद्रोह रहा हो, या फिर बेकाबू हो गया कोई आनंदोत्सव।",
        output: [
            "सच्चाई यह है कि इसे कोई नहीं जानता।",
            "हो सकता है यह फ़्रेन्को के खिलाफ़ कोई विद्रोह रहा हो, या फिर बेकाबू हो गया कोई आनंदोत्सव।"
        ],
        skip: true
    },

    // Golden Rules (Armenian)

    {
        name: "Sentence ending punctuation",
        input: "Ի՞նչ ես մտածում: Ոչինչ:",
        output: ["Ի՞նչ ես մտածում:", "Ոչինչ:"],
        skip: true
    },

    {
        name: "Ellipsis",
        input: "Ապրիլի 24-ին սկսեց անձրևել...Այդպես էի գիտեի:",
        output: ["Ապրիլի 24-ին սկսեց անձրևել...Այդպես էի գիտեի:"],
        skip: true
    },

    {
        name: "Period is not a sentence boundary",
        input: "Այսպիսով` մոտենում ենք ավարտին: Տրամաբանությյունը հետևյալն է. պարզություն և աշխատանք:",
        output: ["Այսպիսով` մոտենում ենք ավարտին:", "Տրամաբանությյունը հետևյալն է. պարզություն և աշխատանք:"],
        skip: true
    },

    // Golden Rules (Burmese)

    {
        name: "Sentence ending punctuation",
        input: "ခင္ဗ်ားနာမည္ဘယ္လိုေခၚလဲ။၇ွင္ေနေကာင္းလား။",
        output: ["ခင္ဗ်ားနာမည္ဘယ္လိုေခၚလဲ။", "၇ွင္ေနေကာင္းလား။"],
        skip: true
    },

    // Golden Rules (Amharic)

    {
        name: "Sentence ending punctuation",
        input: "እንደምን አለህ፧መልካም ቀን ይሁንልህ።እባክሽ ያልሽዉን ድገሚልኝ።",
        output: ["እንደምን አለህ፧", "መልካም ቀን ይሁንልህ።", "እባክሽ ያልሽዉን ድገሚልኝ።"],
        skip: true
    },

    // Golden Rules (Persian)

    {
        name: "Sentence ending punctuation",
        input: "خوشبختم، آقای رضا. شما کجایی هستید؟ من از تهران هستم.",
        output: ["خوشبختم، آقای رضا.", "شما کجایی هستید؟", "من از تهران هستم."],
        skip: true
    },

    // Golden Rules (Urdu)

    {
        name: "Sentence ending punctuation",
        input: "کیا حال ہے؟ ميرا نام ___ ەے۔ میں حالا تاوان دےدوں؟",
        output: ["کیا حال ہے؟", "ميرا نام ___ ەے۔", "میں حالا تاوان دےدوں؟"],
        skip: true
    }
];
