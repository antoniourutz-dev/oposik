import { QuizData } from '../types';
import { KorrikaEdukia } from '../services/korrikaApi';

export const PROFILING_DEMO_QUIZ_DATA: QuizData[] = [
    {
        capitulo: 'Euskara',
        preguntas: [
            {
                id: 1001,
                pregunta: 'Euskara zein hizkuntza familiatakoa da?',
                respuesta_correcta: 'b',
                opciones: {
                    a: 'Erromantzea',
                    b: 'Isolatua',
                    c: 'Germaniarra',
                    d: 'Eslaviarra'
                }
            },
            {
                id: 1002,
                pregunta: 'Zein da "eskerrik asko" gaztelaniaz?',
                respuesta_correcta: 'a',
                opciones: {
                    a: 'gracias',
                    b: 'adios',
                    c: 'hola',
                    d: 'perdon'
                }
            }
        ]
    },
    {
        capitulo: 'Korrika',
        preguntas: [
            {
                id: 1003,
                pregunta: 'Korrikaren helburu nagusia zein da?',
                respuesta_correcta: 'c',
                opciones: {
                    a: 'Turismoa',
                    b: 'Kirol txapelketa',
                    c: 'Euskara sustatzea',
                    d: 'Ibilgailu lasterketa'
                }
            },
            {
                id: 1004,
                pregunta: 'Korrika AEKrekin lotuta dago?',
                respuesta_correcta: 'd',
                opciones: {
                    a: 'Ez, inoiz ez',
                    b: 'Bakarrik udan',
                    c: 'Soilik online',
                    d: 'Bai, guztiz lotuta'
                }
            }
        ]
    },
    {
        capitulo: 'Historia',
        preguntas: [
            {
                id: 1005,
                pregunta: 'Euskal Herria Europan dago?',
                respuesta_correcta: 'a',
                opciones: {
                    a: 'Bai',
                    b: 'Ez',
                    c: 'Batzuetan',
                    d: 'Kontinenterik gabe'
                }
            },
            {
                id: 1006,
                pregunta: 'Nafarroa Euskal Herriko lurralde bat da?',
                respuesta_correcta: 'b',
                opciones: {
                    a: 'Ez',
                    b: 'Bai',
                    c: 'Bakarrik mapan',
                    d: 'Ez dakit'
                }
            }
        ]
    },
    {
        capitulo: 'Kultura',
        preguntas: [
            {
                id: 1007,
                pregunta: 'Bertsolaritza ahozko tradizioa da?',
                respuesta_correcta: 'c',
                opciones: {
                    a: 'Ez, idatzia da',
                    b: 'Musika klasikoa da',
                    c: 'Bai, ahozkoa da',
                    d: 'Soilik zineman'
                }
            },
            {
                id: 1008,
                pregunta: 'Trikitixa zer da?',
                respuesta_correcta: 'd',
                opciones: {
                    a: 'Jantzi bat',
                    b: 'Mendi bat',
                    c: 'Liburu bat',
                    d: 'Musika tresna eta estiloa'
                }
            }
        ]
    },
    {
        capitulo: 'Geografia',
        preguntas: [
            {
                id: 1009,
                pregunta: 'Bilbo Bizkaian dago?',
                respuesta_correcta: 'a',
                opciones: {
                    a: 'Bai',
                    b: 'Ez',
                    c: 'Arabako hiriburua da',
                    d: 'Nafarroan dago'
                }
            },
            {
                id: 1010,
                pregunta: 'Donostia itsaso ondoan dago?',
                respuesta_correcta: 'b',
                opciones: {
                    a: 'Ez',
                    b: 'Bai',
                    c: 'Basamortuan',
                    d: 'Mendirik gabe'
                }
            }
        ]
    },
    {
        capitulo: 'Gizartea',
        preguntas: [
            {
                id: 1011,
                pregunta: 'Egunerokoan euskara erabiltzea garrantzitsua da?',
                respuesta_correcta: 'c',
                opciones: {
                    a: 'Ez du eraginik',
                    b: 'Bakarrik eskolan',
                    c: 'Bai, biziberritzeko giltza da',
                    d: 'Soilik jaietan'
                }
            },
            {
                id: 1012,
                pregunta: 'Hizkuntza bat erabiltzen ez bada, zer gertatzen da?',
                respuesta_correcta: 'd',
                opciones: {
                    a: 'Automatikoki indartzen da',
                    b: 'Ez da ezer gertatzen',
                    c: 'Berez berritzen da',
                    d: 'Ahuldu edo gal daiteke'
                }
            }
        ]
    }
];

export const PROFILING_DEMO_EDUKIAK: KorrikaEdukia[] = [
    {
        day: 1,
        title: 'Profilatzeko saio automatikoa',
        content: 'Eduki honek apparen errendimendua neurtzeko pantailak automatikoki zeharkatzen ditu.'
    }
];
