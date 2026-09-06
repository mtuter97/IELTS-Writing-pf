/**
 * Official IDP IELTS Writing Band Descriptors (Bands 0 - 9)
 * Source: https://ielts.idp.com/results/scores/writing
 * Verbatim criteria descriptors for full transparency and reference.
 */

export const IDP_META = {
  sourceUrl: "https://ielts.idp.com/results/scores/writing",
  tasks: {
    task2: {
      name: "Writing Task 2 (المقال الأكاديمي)",
      weight: "66.7% (ثلثا درجة الكتابة)",
      minWords: 250,
      timeMins: 40,
      trName: "Task Response (TR)"
    },
    task1: {
      name: "Writing Task 1 (تقرير البيانات / الرسالة)",
      weight: "33.3% (ثلث درجة الكتابة)",
      minWords: 150,
      timeMins: 20,
      trName: "Task Achievement (TA)"
    }
  },
  criteria: [
    { key: "tr", nameEn: "Task Response / Achievement", nameAr: "استيفاء متطلبات المهمة", weight: "25%", color: "var(--primary)" },
    { key: "cc", nameEn: "Coherence & Cohesion", nameAr: "الترابط والتماسك المنطقي", weight: "25%", color: "#ff853f" },
    { key: "lr", nameEn: "Lexical Resource", nameAr: "الثروة اللغوية والمعجمية", weight: "25%", color: "#15c1fa" },
    { key: "gra", nameEn: "Grammatical Range & Accuracy", nameAr: "تنوع القواعد ودقتها", weight: "25%", color: "#a64cf9" }
  ]
};

export const OFFICIAL_IDP_DESCRIPTORS = {
  "task1": {
    "band_9": {
      "task_achievement": "All the requirements of the task are fully and appropriately satisfied.\n\nThere may be extremely rare lapses in content.",
      "coherence_cohesion": "The message can be followed effortlessly.\n\nCohesion is used in such a way that it very rarely attracts attention.\n\nAny lapses in coherence or cohesion are minimal.\n\nParagraphing is skilfully managed.",
      "lexical_resource": "Full flexibility and precise use are evident within the scope of the task.\n\nA wide range of vocabulary is used accurately and appropriately with very natural and sophisticated control of lexical features.\n\nMinor errors in spelling and word formation are extremely rare and have minimal impact on communication.",
      "grammatical_range_accuracy": "A wide range of structures within the scope of the task is used with full flexibility and control.\n\nPunctuation and grammar are used appropriately throughout.\n\nMinor errors are extremely rare and have minimal impact on communication."
    },
    "band_8": {
      "task_achievement": "The response covers all the requirements of the task appropriately, relevantly and sufficiently.\n\n(Academic) Key features are skilfully selected, and clearly presented, highlighted and illustrated.\n\n(General Training) All bullet points are clearly presented, and appropriately illustrated or extended.\n\nThere may be occasional omissions or lapses in content.",
      "coherence_cohesion": "The message can be followed with ease.\n\nInformation and ideas are logically sequenced, and cohesion is well managed.\n\nOccasional lapses in coherence or cohesion may occur.\n\nParagraphing is used sufficiently and appropriately.",
      "lexical_resource": "A wide resource is fluently and flexibly used to convey precise meanings within the scope of the task.\n\nThere is a skilful use of uncommon and/or idiomatic items when appropriate, despite occasional inaccuracies in word choice and collocation.\n\nOccasional errors in spelling and/or word formation may occur, but have minimal impact on communication.",
      "grammatical_range_accuracy": "A wide range of structures within the scope of the task is flexibly and accurately used.\n\nThe majority of sentences are error-free, and punctuation is well managed. \n\nOccasional, non-systematic errors and inappropriacies occur, but have minimal impact on communication."
    },
    "band_7": {
      "task_achievement": "The response covers the requirements of the task.\n\nThe content is relevant and accurate – there may be a few omissions or lapses. The format is appropriate.\n\n(Academic) Key features which are selected are covered and clearly highlighted but could be more fully or more appropriately illustrated or extended.\n\n(Academic) It presents a clear overview, the data are appropriately categorised, and main trends or differences are identified.\n\n(General Training) All bullet points are covered and clearly highlighted but could be more fully or more appropriately illustrated or extended. It presents a clear purpose. The tone is consistent and appropriate to the task. Any lapses are minimal.",
      "coherence_cohesion": "Information and ideas are logically organised and there is a clear progression throughout the response. A few lapses may occur.\n\nA range of cohesive devices including reference and substitution is used flexibly but with some inaccuracies or some over/under use.",
      "lexical_resource": "The resource is sufficient to allow some flexibility and precision.\n\nThere is some ability to use less common and/or idiomatic items.\n\nAn awareness of style and collocation is evident, though inappropriacies occur.\n\nThere are only a few errors in spelling and/or word formation, and they do not detract from overall clarity.",
      "grammatical_range_accuracy": "A variety of complex structures is used with some flexibility and accuracy.\n\nGrammar and punctuation are generally well controlled, and error-free sentences are frequent.\n\nA few errors in grammar may persist, but these do not impede communication"
    },
    "band_6": {
      "task_achievement": "The response focuses on the requirements of the task and an appropriate format is used.\n\n(Academic) Key features which are selected are covered and adequately highlighted. A relevant overview is attempted. Information is appropriately selected and supported using figures/data.\n\n(General Training) All bullet points are covered and adequately highlighted. The purpose is generally clear. There may be minor inconsistencies in tone.\n\nSome irrelevant, inappropriate or inaccurate information may occur in areas of detail or when illustrating or extending the main points.\n\nSome details may be missing (or excessive) and further extension or illustration may be needed.",
      "coherence_cohesion": "Information and ideas are generally arranged coherently and there is a clear overall progression.\n\nCohesive devices are used to some good effect but cohesion within and/or between sentences may be faulty or mechanical due to misuse, overuse or omission.\n\nThe use of reference and substitution may lack flexibility or clarity and result in some repetition or error.",
      "lexical_resource": "The resource is generally adequate and appropriate for the task.\n\nThe meaning is generally clear in spite of a rather restricted range or a lack of precision in word choice.\n\nIf the writer is a risk-taker, there will be a wider range of vocabulary used but higher degrees of inaccuracy or inappropriacy.\n\nThere are some errors in spelling and/or word formation, but these do not impede communication.",
      "grammatical_range_accuracy": "A mix of simple and complex sentence forms is used but flexibility is limited.\n\nExamples of more complex structures are not marked by the same level of accuracy as in simple structures.\n\nErrors in grammar and punctuation occur, but rarely impede communication."
    },
    "band_5": {
      "task_achievement": "The response generally addresses the requirements of the task. The format may be inappropriate in places.\n\n(Academic) Key features which are selected are not adequately covered. The recounting of detail is mainly mechanical. There may be no data to support the description.\n\n(General Training) All bullet points are presented but one or more may not be adequately covered. The purpose may be unclear at times. The tone may be variable and sometimes inappropriate.\n\nThere may be a tendency to focus on details (without referring to the bigger picture).\n\nThe inclusion of irrelevant, inappropriate or inaccurate material in key areas detracts from the task achievement.\n\nThere is limited detail when extending and illustrating the main points",
      "coherence_cohesion": "Organisation is evident but is not wholly logical and there may be a lack of overall progression. Nevertheless, there is a sense of underlying coherence to the response.\n\nThe relationship of ideas can be followed but the sentences are not fluently linked to each other.\n\nThere may be limited/overuse of cohesive devices with some inaccuracy.\n\nThe writing may be repetitive due to inadequate and/or inaccurate use of reference and substitution.",
      "lexical_resource": "The resource is limited but minimally adequate for the task.\n\nSimple vocabulary may be used accurately but the range does not permit much variation in expression.\n\nThere may be frequent lapses in the appropriacy of word choice, and a lack of flexibility is apparent in frequent simplifications and/or repetitions.\n\nErrors in spelling and/or word formation may be noticeable and may cause some difficulty for the reader.",
      "grammatical_range_accuracy": "The range of structures is limited and rather repetitive.\n\nAlthough complex sentences are attempted, they tend to be faulty, and the greatest accuracy is achieved on simple sentences.\n\nGrammatical errors may be frequent and cause some difficulty for the reader.\n\nPunctuation may be faulty."
    },
    "band_4": {
      "task_achievement": "The response is an attempt to address the task.\n\n(Academic) Few key features have been selected.\n\n(General Training) Not all bullet points are presented.\n\n(General Training) The purpose of the letter is not clearly explained and may be confused.The tone may be inappropriate.\n\nThe format may be inappropriate.\n\nKey features/bullet points which are presented may be irrelevant, repetitive, inaccurate or inappropriate.",
      "coherence_cohesion": "Information and ideas are evident but not arranged coherently, and there is no clear progression within the response.\n\nRelationships between ideas can be unclear and/or inadequately marked. There is some use of basic cohesive devices, which may be inaccurate or repetitive. \n\nThere is inaccurate use or a lack of substitution or referencing",
      "lexical_resource": "The resource is limited and inadequate for or unrelated to the task. Vocabulary is basic and may be used repetitively. \n\nThere may be inappropriate use of lexical chunks (e.g. memorised phrases, formulaic language and/or language from the input material).\n\nInappropriate word choice and/or errors in word formation and/or in spelling may impede meaning",
      "grammatical_range_accuracy": "A very limited range of structures is used. \n\nSubordinate clauses are rare and simple sentences predominate.\n\nSome structures are produced accurately but grammatical errors are frequent and may impede meaning.\n\nPunctuation is often faulty or inadequate"
    },
    "band_3": {
      "task_achievement": "The response does not address the requirements of the task (possibly because of misunderstanding of the data/diagram/situation).\n\nKey features/bullet points which are presented may be largely irrelevant.\n\nLimited information is presented, and this may be used repetitively",
      "coherence_cohesion": "There is no apparent logical organisation. Ideas are discernible but difficult to relate to each other.\n\nMinimal use of sequencers or cohesive devices. Those used do not necessarily indicate a logical relationship between ideas.\n\nThere is difficulty in identifying referencing.",
      "lexical_resource": "The resource is inadequate (which may be due to the response being significantly underlength).\n\nPossible over-dependence on input material or memorised language.\n\nControl of word choice and/or spelling is very limited, and errors predominate. These errors may severely impede meaning.",
      "grammatical_range_accuracy": "Sentence forms are attempted, but errors in grammar and punctuation predominate (except in memorised phrases or those taken from the input material). This prevents most meaning from coming through.\n\nLength may be insufficient to provide evidence of control of sentence forms."
    },
    "band_2": {
      "task_achievement": "The content barely relates to the task.",
      "coherence_cohesion": "There is little relevant message, or the entire response may be off-topic.\n\nThere is little evidence of control of organisational features.",
      "lexical_resource": "The resource is extremely limited with few recognisable strings, apart from memorised phrases.\n\nThere is no apparent control of word formation and/or spelling.",
      "grammatical_range_accuracy": "There is little or no evidence of sentence forms (except in memorised phrases)."
    },
    "band_1": {
      "task_achievement": "Responses of 20 words or fewer are rated at Band 1.\n\nThe content is wholly unrelated to the task.\n\nAny copied rubric must be discounted.",
      "coherence_cohesion": "Responses of 20 words or fewer are rated at Band 1.\n\nThe writing fails to communicate any message and appears to be by a virtual non-writer.",
      "lexical_resource": "Responses of 20 words or fewer are rated at Band 1.\n\nNo resource is apparent, except for a few isolated words.",
      "grammatical_range_accuracy": "Responses of 20 words or fewer are rated at Band 1.\n\nNo rateable language is evident"
    },
    "band_0": {
      "task_achievement": "Should only be used where a candidate did not attend or attempt the question in any way, used a language other than English throughout, or where there is proof that a candidate’s answer has been totally memorised.",
      "coherence_cohesion": "Should only be used where a candidate did not attend or attempt the question in any way, used a language other than English throughout, or where there is proof that a candidate’s answer has been totally memorised.",
      "lexical_resource": "Should only be used where a candidate did not attend or attempt the question in any way, used a language other than English throughout, or where there is proof that a candidate’s answer has been totally memorised.",
      "grammatical_range_accuracy": "Should only be used where a candidate did not attend or attempt the question in any way, used a language other than English throughout, or where there is proof that a candidate’s answer has been totally memorised."
    }
  },
  "task2": {
    "band_9": {
      "task_response": "The prompt is appropriately addressed and explored in depth.\n\nA clear and fully developed position is presented which directly answers the question/s.\n\nIdeas are relevant, fully extended and well supported.\n\nAny lapses in content or support are extremely rare",
      "coherence_cohesion": "The message can be followed effortlessly.\n\nCohesion is used in such a way that it very rarely attracts attention.\n\nAny lapses in coherence or cohesion are minimal.\n\nParagraphing is skilfully managed",
      "lexical_resource": "Full flexibility and precise use are widely evident.\n\nA wide range of vocabulary is used accurately and appropriately with very natural and sophisticated control of lexical features.\n\nMinor errors in spelling and word formation are extremely rare and have minimal impact on communication.",
      "grammatical_range_accuracy": "A wide range of structures is used with full flexibility and control.\n\nPunctuation and grammar are used appropriately throughout.\n\nMinor errors are extremely rare and have minimal impact on communication."
    },
    "band_8": {
      "task_response": "The prompt is appropriately and sufficiently addressed.\n\nA clear and well-developed position is presented in response to the question/s.\n\nIdeas are relevant, well extended and supported.\n\nThere may be occasional omissions or lapses in content.",
      "coherence_cohesion": "The message can be followed with ease.\n\nInformation and ideas are logically sequenced, and cohesion is well managed.\n\nOccasional lapses in coherence and cohesion may occur. \n\nParagraphing is used sufficiently and appropriately.",
      "lexical_resource": "A wide resource is fluently and flexibly used to convey precise meanings.\n\nThere is skilful use of uncommon and/or idiomatic items when appropriate, despite occasional inaccuracies in word choice and collocation.\n\nOccasional errors in spelling and/or word formation may occur, but have minimal impact on communication.",
      "grammatical_range_accuracy": "A wide range of structures is flexibly and accurately used.\n\nThe majority of sentences are error-free, and punctuation is well managed.\n\nOccasional, non-systematic errors and inappropriacies occur, but have minimal impact on communication"
    },
    "band_7": {
      "task_response": "The main parts of the prompt are appropriately addressed.\n\nA clear and developed position is presented.\n\nMain ideas are extended and supported but there may be a tendency to over-generalise or there may be a lack of focus and precision in supporting ideas/material.",
      "coherence_cohesion": "Information and ideas are logically organised, and there is a clear progression throughout the response. (A few lapses may occur, but these are minor.)\n\nA range of cohesive devices including reference and substitution is used flexibly but with some inaccuracies or some over/under use.\n\nParagraphing is generally used effectively to support overall coherence, and the sequencing of ideas within a paragraph is generally logical.",
      "lexical_resource": "The resource is sufficient to allow some flexibility and precision.\n\nThere is some ability to use less common and/or idiomatic items.\n\nAn awareness of style and collocation is evident, though inappropriacies occur.\n\nThere are only a few errors in spelling and/or word formation and they do not detract from overall clarity.",
      "grammatical_range_accuracy": "A variety of complex structures is used with some flexibility and accuracy.\n\nGrammar and punctuation are generally well controlled, and error-free sentences are frequent.\n\nA few errors in grammar may persist, but these do not impede communication."
    },
    "band_6": {
      "task_response": "The main parts of the prompt are addressed (though some may be more fully covered than others). An appropriate format is used.\n\nA position is presented that is directly relevant to the prompt, although the conclusions drawn may be unclear, unjustified or repetitive.\n\nMain ideas are relevant, but some may be insufficiently developed or may lack clarity, while some supporting arguments and evidence may be less relevant or inadequate.",
      "coherence_cohesion": "Information and ideas are generally arranged coherently and there is a clear overall progression.\n\nCohesive devices are used to some good effect but cohesion within and/or between sentences may be faulty or mechanical due to misuse, overuse or omission.\n\nThe use of reference and substitution may lack flexibility or clarity and result in some repetition or error.\n\nParagraphing may not always be logical and/or the central topic may not always be clear.",
      "lexical_resource": "The resource is generally adequate and appropriate for the task.\n\nThe meaning is generally clear in spite of a rather restricted range or a lack of precision in word choice.\n\nIf the writer is a risk-taker, there will be a wider range of vocabulary used but higher degrees of inaccuracy or inappropriacy.\n\nThere are some errors in spelling and/or word formation, but these do not impede communication.",
      "grammatical_range_accuracy": "A mix of simple and complex sentence forms is used but flexibility is limited.\n\nExamples of more complex structures are not marked by the same level of accuracy as in simple structures. \n\nErrors in grammar and punctuation occur, but rarely impede communication"
    },
    "band_5": {
      "task_response": "The main parts of the prompt are incompletely addressed. The format may be inappropriate in places.\n\nThe writer expresses a position, but the development is not always clear.\n\nSome main ideas are put forward, but they are limited and are not sufficiently developed and/or there may be irrelevant detail. \n\nThere may be some repetition.",
      "coherence_cohesion": "Organisation is evident but is not wholly logical and there may be a lack of overall progression. Nevertheless, there is a sense of underlying coherence to the response.\n\nThe relationship of ideas can be followed but the sentences are not fluently linked to each other.\n\nThere may be limited/overuse of cohesive devices with some inaccuracy.\n\nThe writing may be repetitive due to inadequate and/or inaccurate use of reference and substitution.\n\nParagraphing may be inadequate or missing.",
      "lexical_resource": "The resource is limited but minimally adequate for the task.\n\nSimple vocabulary may be used accurately but the range does not permit much variation in expression.\n\nThere may be frequent lapses in the appropriacy of word choice and a lack of flexibility is apparent in frequent simplifications and/or repetitions.\n\nErrors in spelling and/or word formation may be noticeable and may cause some difficulty for the reader.",
      "grammatical_range_accuracy": "The range of structures is limited and rather repetitive. \n\nAlthough complex sentences are attempted, they tend to be faulty, and the greatest accuracy is achieved on simple sentences.\n\nGrammatical errors may be frequent and cause some difficulty for the reader. \n\nPunctuation may be faulty."
    },
    "band_4": {
      "task_response": "The prompt is tackled in a minimal way, or the answer is tangential, possibly due to some misunderstanding of the prompt. The format may be inappropriate.\n\nA position is discernible, but the reader has to read carefully to find it.\n\nMain ideas are difficult to identify and such ideas that are identifiable may lack relevance, clarity and/or support.\n\nLarge parts of the response may be repetitive.",
      "coherence_cohesion": "Information and ideas are evident but not arranged coherently and there is no clear progression within the response.\n\nRelationships between ideas can be unclear and/or inadequately marked. There is some use of basic cohesive devices, which may be inaccurate or repetitive.\n\nThere is inaccurate use or a lack of substitution or referencing.\n\nThere may be no paragraphing and/or no clear main topic within paragraphs.",
      "lexical_resource": "The resource is limited and inadequate for or unrelated to the task. Vocabulary is basic and may be used repetitively.\n\nThere may be inappropriate use of lexical chunks (e.g. memorised phrases, formulaic language and/or language from the input material).\n\nInappropriate word choice and/or errors in word formation and/or in spelling may impede meaning",
      "grammatical_range_accuracy": "A very limited range of structures is used.\n\nSubordinate clauses are rare and simple sentences predominate.\n\nSome structures are produced accurately but grammatical errors are frequent and may impede meaning. \n\nPunctuation is often faulty or inadequate."
    },
    "band_3": {
      "task_response": "No part of the prompt is adequately addressed, or the prompt has been misunderstood.\n\nNo relevant position can be identified, and/or there is little direct response to the question/s.\n\nThere are few ideas, and these may be irrelevant or insufficiently developed.",
      "coherence_cohesion": "There is no apparent logical organisation. Ideas are discernible but difficult to relate to each other.\n\nThere is minimal use of sequencers or cohesive devices. Those used do not necessarily indicate a logical relationship between ideas.\n\nThere is difficulty in identifying referencing. \n\nAny attempts at paragraphing are unhelpful.",
      "lexical_resource": "The resource is inadequate (which may be due to the response being significantly underlength). Possible over-dependence on input material or memorised language.\n\nControl of word choice and/or spelling is very limited, and errors predominate. These errors may severely impede meaning",
      "grammatical_range_accuracy": "Sentence forms are attempted, but errors in grammar and punctuation predominate (except in memorised phrases or those taken from the input material). This prevents most meaning from coming through. \n\nLength may be insufficient to provide evidence of control of sentence forms."
    },
    "band_2": {
      "task_response": "The content is barely related to the prompt. \n\nNo position can be identified.\n\nThere may be glimpses of one or two ideas without development.",
      "coherence_cohesion": "There is little relevant message, or the entire response may be off-topic.\n\nThere is little evidence of control of organisational features.",
      "lexical_resource": "The resource is extremely limited with few recognisable strings, apart from memorised phrases.\n\nThere is no apparent control of word formation and/or spelling.",
      "grammatical_range_accuracy": "There is little or no evidence of sentence forms (except in memorised phrases)."
    },
    "band_1": {
      "task_response": "Responses of 20 words or fewer are rated at Band 1.\n\nThe content is wholly unrelated to the prompt.\n\nAny copied rubric must be discounted.",
      "coherence_cohesion": "Responses of 20 words or fewer are rated at Band 1.\n\nThe writing fails to communicate any message and appears to be by a virtual non-writer.",
      "lexical_resource": "Responses of 20 words or fewer are rated at Band 1.\n\nNo resource is apparent, except for a few isolated words.",
      "grammatical_range_accuracy": "Responses of 20 words or fewer are rated at Band 1.\n\nNo rateable language is evident."
    },
    "band_0": {
      "task_response": "Should only be used where a candidate did not attend or attempt the question in any way, used a language other than English, or where there is proof that a candidate’s answer has been totally memorised.",
      "coherence_cohesion": "Should only be used where a candidate did not attend or attempt the question in any way, used a language other than English, or where there is proof that a candidate’s answer has been totally memorised.",
      "lexical_resource": "Should only be used where a candidate did not attend or attempt the question in any way, used a language other than English, or where there is proof that a candidate’s answer has been totally memorised.",
      "grammatical_range_accuracy": "Should only be used where a candidate did not attend or attempt the question in any way, used a language other than English, or where there is proof that a candidate’s answer has been totally memorised."
    }
  }
};
