'use client';

import { useState, useEffect, useMemo } from 'react';

/* ── 300 idioms (from original idioms_quiz.js) ── */
const idiomsData = [
    { idiom: "A blessing in disguise", meaning: "Something that seems bad but turns out to be good" },
    { idiom: "A dime a dozen", meaning: "Very common and of no particular value" },
    { idiom: "A piece of cake", meaning: "Something very easy to do" },
    { idiom: "A slap on the wrist", meaning: "A mild punishment or warning" },
    { idiom: "Actions speak louder than words", meaning: "What you do is more important than what you say" },
    { idiom: "Add insult to injury", meaning: "To make a bad situation worse" },
    { idiom: "At the drop of a hat", meaning: "Without any hesitation; instantly" },
    { idiom: "Back to the drawing board", meaning: "Start over after a failed attempt" },
    { idiom: "Ball is in your court", meaning: "It's up to you to make the next decision" },
    { idiom: "Barking up the wrong tree", meaning: "Looking in the wrong place; pursuing a mistaken course" },
    { idiom: "Beat around the bush", meaning: "Avoid saying something directly" },
    { idiom: "Bite off more than you can chew", meaning: "Take on more than you can handle" },
    { idiom: "Break a leg", meaning: "Good luck (typically said to performers)" },
    { idiom: "Break the ice", meaning: "Make people feel more comfortable" },
    { idiom: "Burn the midnight oil", meaning: "Work late into the night" },
    { idiom: "Burst someone's bubble", meaning: "Destroy someone's illusions or hopes" },
    { idiom: "By the skin of your teeth", meaning: "Just barely; narrowly" },
    { idiom: "Call it a day", meaning: "Stop working on something" },
    { idiom: "Caught between a rock and a hard place", meaning: "Faced with two difficult choices" },
    { idiom: "Cost an arm and a leg", meaning: "Be very expensive" },
    { idiom: "Cross that bridge when you come to it", meaning: "Deal with a problem when it happens" },
    { idiom: "Cry over spilt milk", meaning: "Complain about something that cannot be changed" },
    { idiom: "Cut corners", meaning: "Do something poorly to save time or money" },
    { idiom: "Cut to the chase", meaning: "Get to the point without wasting time" },
    { idiom: "Devil's advocate", meaning: "Someone who argues against something to test its validity" },
    { idiom: "Don't count your chickens before they hatch", meaning: "Don't assume something will happen" },
    { idiom: "Don't put all your eggs in one basket", meaning: "Don't risk everything on one venture" },
    { idiom: "Drastic times call for drastic measures", meaning: "Extreme situations require extreme actions" },
    { idiom: "Every cloud has a silver lining", meaning: "There's something good in every bad situation" },
    { idiom: "Face the music", meaning: "Accept the consequences of your actions" },
    { idiom: "Get out of hand", meaning: "Become uncontrollable" },
    { idiom: "Get your act together", meaning: "Organize yourself; improve your behavior" },
    { idiom: "Give someone the benefit of the doubt", meaning: "Trust what someone says" },
    { idiom: "Go the extra mile", meaning: "Make an extra effort" },
    { idiom: "Good things come to those who wait", meaning: "Patience brings rewards" },
    { idiom: "Hit the nail on the head", meaning: "Be exactly right about something" },
    { idiom: "Hit the sack", meaning: "Go to bed" },
    { idiom: "In hot water", meaning: "In trouble" },
    { idiom: "It takes two to tango", meaning: "Both parties are responsible" },
    { idiom: "Jump on the bandwagon", meaning: "Join a popular activity or trend" },
    { idiom: "Keep your chin up", meaning: "Stay positive; remain cheerful" },
    { idiom: "Kill two birds with one stone", meaning: "Accomplish two things with one action" },
    { idiom: "Let sleeping dogs lie", meaning: "Avoid interfering with a situation" },
    { idiom: "Let the cat out of the bag", meaning: "Reveal a secret" },
    { idiom: "Make a long story short", meaning: "Tell something briefly" },
    { idiom: "Miss the boat", meaning: "Miss an opportunity" },
    { idiom: "No pain, no gain", meaning: "You have to work hard to achieve results" },
    { idiom: "Not rocket science", meaning: "Not difficult to understand" },
    { idiom: "Off the hook", meaning: "No longer in trouble or responsible" },
    { idiom: "On cloud nine", meaning: "Extremely happy" },
    { idiom: "On the ball", meaning: "Alert and competent" },
    { idiom: "On thin ice", meaning: "In a risky or dangerous situation" },
    { idiom: "Once in a blue moon", meaning: "Very rarely" },
    { idiom: "Out of the blue", meaning: "Unexpectedly" },
    { idiom: "Over the moon", meaning: "Extremely pleased or happy" },
    { idiom: "Pull someone's leg", meaning: "Tease or joke with someone" },
    { idiom: "Pull yourself together", meaning: "Calm down and regain composure" },
    { idiom: "Rain on someone's parade", meaning: "Spoil someone's plans or happiness" },
    { idiom: "Read between the lines", meaning: "Understand the hidden meaning" },
    { idiom: "Ring a bell", meaning: "Sound familiar" },
    { idiom: "Rome wasn't built in a day", meaning: "Important things take time" },
    { idiom: "See eye to eye", meaning: "Agree with someone" },
    { idiom: "Sit on the fence", meaning: "Remain neutral; not take sides" },
    { idiom: "Speak of the devil", meaning: "The person we were talking about just arrived" },
    { idiom: "Spill the beans", meaning: "Reveal secret information" },
    { idiom: "Steal someone's thunder", meaning: "Take credit for someone else's achievement" },
    { idiom: "Take it with a grain of salt", meaning: "Don't take something too seriously" },
    { idiom: "Take the bull by the horns", meaning: "Deal with a difficult situation directly" },
    { idiom: "The elephant in the room", meaning: "An obvious problem that nobody wants to discuss" },
    { idiom: "The last straw", meaning: "The final problem that makes you lose patience" },
    { idiom: "The whole nine yards", meaning: "Everything; all of it" },
    { idiom: "Throw in the towel", meaning: "Give up; quit" },
    { idiom: "Time flies", meaning: "Time passes quickly" },
    { idiom: "Under the weather", meaning: "Feeling sick or ill" },
    { idiom: "Up in the air", meaning: "Uncertain or undecided" },
    { idiom: "Walk on eggshells", meaning: "Be very careful not to offend someone" },
    { idiom: "Water under the bridge", meaning: "Past events that are no longer important" },
    { idiom: "When pigs fly", meaning: "Something that will never happen" },
    { idiom: "Wild goose chase", meaning: "A hopeless pursuit" },
    { idiom: "Wolf in sheep's clothing", meaning: "Someone who appears harmless but is dangerous" },
    { idiom: "A drop in the ocean", meaning: "A very small amount compared to what is needed" },
    { idiom: "A hot potato", meaning: "A controversial issue that is difficult to handle" },
    { idiom: "A leopard can't change its spots", meaning: "People cannot change their basic nature" },
    { idiom: "All bark and no bite", meaning: "Threatening but not dangerous" },
    { idiom: "All ears", meaning: "Listening attentively" },
    { idiom: "Apple of my eye", meaning: "Someone very precious or dear" },
    { idiom: "Achilles' heel", meaning: "A weakness or vulnerable point" },
    { idiom: "Against all odds", meaning: "Despite very low probability" },
    { idiom: "Back against the wall", meaning: "In a difficult situation with no escape" },
    { idiom: "Bad blood", meaning: "Ill feeling or hostility between people" },
    { idiom: "Baptism of fire", meaning: "A difficult introduction to something" },
    { idiom: "Beat a dead horse", meaning: "Waste time on something that won't succeed" },
    { idiom: "Bite the bullet", meaning: "Endure a painful situation bravely" },
    { idiom: "Black sheep", meaning: "A disgrace to the family or group" },
    { idiom: "Blow off steam", meaning: "Release pent-up energy or emotion" },
    { idiom: "Born with a silver spoon", meaning: "Born into wealth" },
    { idiom: "Break new ground", meaning: "Do something innovative" },
    { idiom: "Bring home the bacon", meaning: "Earn a living" },
    { idiom: "Bury the hatchet", meaning: "Make peace; end a quarrel" },
    { idiom: "Butterflies in my stomach", meaning: "Nervous or anxious feeling" },
    { idiom: "Can of worms", meaning: "A complex, troublesome situation" },
    { idiom: "Catch-22", meaning: "A problematic situation with no solution" },
    { idiom: "Clean slate", meaning: "A fresh start" },
    { idiom: "Cold feet", meaning: "Nervous about doing something" },
    { idiom: "Cool as a cucumber", meaning: "Very calm and relaxed" },
    { idiom: "Couch potato", meaning: "A lazy person who watches a lot of TV" },
    { idiom: "Crocodile tears", meaning: "Fake tears; insincere sympathy" },
    { idiom: "Cry wolf", meaning: "Raise a false alarm" },
    { idiom: "Dark horse", meaning: "An unexpected winner or success" },
    { idiom: "Diamond in the rough", meaning: "Someone with hidden potential" },
    { idiom: "Early bird catches the worm", meaning: "Success comes to those who prepare" },
    { idiom: "Easier said than done", meaning: "More difficult than it appears" },
    { idiom: "Eat humble pie", meaning: "Admit you were wrong" },
    { idiom: "Elbow grease", meaning: "Hard physical work" },
    { idiom: "Fish out of water", meaning: "Uncomfortable in unfamiliar surroundings" },
    { idiom: "Flash in the pan", meaning: "Success that doesn't last" },
    { idiom: "Fly off the handle", meaning: "Suddenly become very angry" },
    { idiom: "Food for thought", meaning: "Something worth thinking about" },
    { idiom: "From scratch", meaning: "From the beginning" },
    { idiom: "From the horse's mouth", meaning: "From a reliable source" },
    { idiom: "Get cold feet", meaning: "Become nervous about doing something" },
    { idiom: "Give the cold shoulder", meaning: "Deliberately ignore someone" },
    { idiom: "Go out on a limb", meaning: "Take a risk" },
    { idiom: "Golden handshake", meaning: "A large payment given to someone leaving a job" },
    { idiom: "Green with envy", meaning: "Very jealous" },
    { idiom: "Head in the clouds", meaning: "Not paying attention to reality" },
    { idiom: "Heart of gold", meaning: "A kind and generous nature" },
    { idiom: "Hit the ground running", meaning: "Start with energy and enthusiasm" },
    { idiom: "Hold your horses", meaning: "Wait; be patient" },
    { idiom: "In a nutshell", meaning: "Briefly; in summary" },
    { idiom: "In the nick of time", meaning: "Just in time" },
    { idiom: "Jump the gun", meaning: "Start too soon" },
    { idiom: "Keep your eye on the ball", meaning: "Stay focused" },
    { idiom: "Kick the bucket", meaning: "Die" },
    { idiom: "Leave no stone unturned", meaning: "Try everything possible" },
    { idiom: "Let bygones be bygones", meaning: "Forget past disagreements" },
    { idiom: "Level playing field", meaning: "Fair conditions for everyone" },
    { idiom: "Long shot", meaning: "Something unlikely to succeed" },
    { idiom: "Loose cannon", meaning: "An unpredictable person" },
    { idiom: "Make ends meet", meaning: "Have just enough money to survive" },
    { idiom: "Make hay while the sun shines", meaning: "Take advantage of opportunities" },
    { idiom: "Neck and neck", meaning: "Very close in competition" },
    { idiom: "Nip it in the bud", meaning: "Stop something at an early stage" },
    { idiom: "On pins and needles", meaning: "Anxious; nervous" },
    { idiom: "Once bitten, twice shy", meaning: "Cautious after a bad experience" },
    { idiom: "Out of the frying pan into the fire", meaning: "From bad to worse" },
    { idiom: "Paint the town red", meaning: "Go out and celebrate" },
    { idiom: "Pass the buck", meaning: "Shift responsibility to someone else" },
];

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function generateQuestions(data) {
    const shuffled = shuffle(data);
    return shuffled.map(item => {
        const distractors = shuffle(data.filter(d => d.meaning !== item.meaning)).slice(0, 3).map(d => d.meaning);
        const options = shuffle([item.meaning, ...distractors]);
        return { idiom: item.idiom, options, correct: options.indexOf(item.meaning) };
    });
}

export default function IdiomsView() {
    const { data: session } = useSession();
    const confirmDialog = useConfirm();
    const questions = useMemo(() => generateQuestions(idiomsData), []);

    const [current, setCurrent] = useState(0);
    const [score, setScore] = useState(0);
    const [answered, setAnswered] = useState(0);
    const [selected, setSelected] = useState(null);
    const [showResult, setShowResult] = useState(false);

    useEffect(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('assessra_idioms_progress'));
            if (saved) { setCurrent(saved.current || 0); setScore(saved.score || 0); setAnswered(saved.answered || 0); }
        } catch { }
    }, []);

    function save(c, s, a) { localStorage.setItem('assessra_idioms_progress', JSON.stringify({ current: c, score: s, answered: a })); }

    function handleAnswer(idx) {
        if (selected !== null) return;
        const isCorrect = idx === questions[current].correct;
        setSelected(idx);
        const ns = isCorrect ? score + 1 : score;
        const na = answered + 1;
        setScore(ns); setAnswered(na); save(current, ns, na);
    }

    function next() {
        const n = current + 1;
        if (n >= questions.length) { setShowResult(true); return; }
        setCurrent(n); setSelected(null); save(n, score, answered);
    }

    // --- Admin Feature: Reset Progress ---
    const handleResetAll = async () => {
        const isConfirmed = await confirmDialog('Reset Progress', 'Are you sure you want to reset all idioms progress? This action cannot be undone.');
        if (!isConfirmed) return;
        try {
            setCurrent(0); setScore(0); setAnswered(0); setSelected(null); setShowResult(false);
            localStorage.removeItem('assessra_idioms_progress');
        } catch (error) {
            console.error("Failed to reset idioms progress:", error);
            // Optionally, show an error message to the user
        }
    };

    if (showResult || current >= questions.length) {
        const pct = answered > 0 ? Math.round((score / answered) * 100) : 0;
        return (
            <div style={{ maxWidth: 800, margin: '80px auto', padding: 40, background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', borderRadius: 20, boxShadow: '0 10px 40px rgba(0,0,0,0.15)', textAlign: 'center' }}>
                <div style={{ fontSize: '5rem', marginBottom: 20 }}>🎉</div>
                <h1 style={{ color: 'var(--lime-dark)', fontSize: '2.8rem', marginBottom: 15 }}>Quiz Complete!</h1>
                <div style={{ fontSize: '3rem', fontWeight: 800, color: '#16a34a', margin: '20px 0' }}>{score}/{answered}</div>
                <p style={{ fontSize: '1.3rem', color: '#666', marginBottom: 30 }}>{pct}% Correct</p>
                <button onClick={handleResetAll} style={{ padding: '15px 40px', background: 'linear-gradient(135deg, var(--lime-primary), #16a34a)', color: 'white', border: 'none', borderRadius: 12, fontSize: '1.2rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(132,204,22,0.3)' }}>🔄 Restart Quiz</button>
            </div>
        );
    }

    const q = questions[current];
    const progress = Math.round((answered / questions.length) * 100);

    return (
        <div style={{ maxWidth: 900, margin: '40px auto', padding: 30 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
                <h1 style={{ color: 'var(--lime-dark)', fontSize: '2.2rem', margin: 0 }}>💬 Idioms Quiz</h1>
                <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.9rem', color: '#888', marginBottom: 5 }}>Score</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--lime-dark)' }}>{score}/{answered}</div>
                    </div>
                    <button onClick={handleResetAll} style={{ padding: '10px 20px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>🔄 Reset</button>
                </div>
            </div>

            {/* Progress Bar */}
            <div style={{ background: '#e5e7eb', borderRadius: 10, height: 12, marginBottom: 25, overflow: 'hidden' }}>
                <div style={{ background: 'linear-gradient(90deg, var(--lime-primary), #16a34a)', height: '100%', width: `${progress}%`, transition: 'width 0.3s' }} />
            </div>
            <div style={{ textAlign: 'center', color: '#666', marginBottom: 30 }}>Question {answered + 1} of {questions.length}</div>

            {/* Idiom Card */}
            <div style={{ background: 'linear-gradient(135deg, #fff, #f9fafb)', padding: 40, borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: 30, borderLeft: '6px solid var(--lime-primary)' }}>
                <div style={{ fontSize: '1.1rem', color: '#888', marginBottom: 15, fontWeight: 600 }}>What does this idiom mean?</div>
                <h2 style={{ fontSize: '2rem', color: 'var(--lime-dark)', margin: 0, lineHeight: 1.4 }}>&ldquo;{q.idiom}&rdquo;</h2>
            </div>

            {/* Options */}
            <div style={{ display: 'grid', gap: 15, marginBottom: 25 }}>
                {q.options.map((opt, idx) => {
                    let bg = 'white', border = '#e5e7eb', color = '#333';
                    if (selected !== null) {
                        if (idx === q.correct) { bg = '#22c55e'; border = '#22c55e'; color = 'white'; }
                        else if (idx === selected && idx !== q.correct) { bg = '#ef4444'; border = '#ef4444'; color = 'white'; }
                    }
                    return (
                        <button key={idx} disabled={selected !== null} onClick={() => handleAnswer(idx)}
                            style={{ padding: '20px 25px', background: bg, border: `3px solid ${border}`, borderRadius: 12, textAlign: 'left', cursor: selected !== null ? 'not-allowed' : 'pointer', fontSize: '1.05rem', color, fontWeight: 500, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', transition: 'all 0.2s' }}>
                            <span style={{ display: 'inline-block', width: 30, height: 30, background: selected !== null ? 'transparent' : '#f0f0f0', borderRadius: '50%', textAlign: 'center', lineHeight: '30px', marginRight: 15, fontWeight: 700, color: selected !== null ? color : '#666' }}>{String.fromCharCode(65 + idx)}</span>
                            {opt}
                        </button>
                    );
                })}
            </div>

            {/* Feedback */}
            {selected !== null && (
                <div style={{ padding: 20, borderRadius: 12, marginBottom: 20, background: selected === q.correct ? '#f0fdf4' : '#fef2f2', textAlign: 'center' }}>
                    <h3 style={{ color: selected === q.correct ? '#22c55e' : '#ef4444', marginBottom: 15, fontSize: '1.4rem', fontWeight: 700 }}>
                        {selected === q.correct ? '✅ Correct!' : '❌ Incorrect'}
                    </h3>
                    <p style={{ fontSize: '1.15rem', color: '#333' }}><strong>Correct Answer:</strong> {String.fromCharCode(65 + q.correct)}. {q.options[q.correct]}</p>
                </div>
            )}

            {/* Next */}
            {selected !== null && (
                <div style={{ textAlign: 'center' }}>
                    <button onClick={next} style={{ padding: '15px 50px', background: 'linear-gradient(135deg, var(--lime-primary), #16a34a)', color: 'white', border: 'none', borderRadius: 12, fontSize: '1.2rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(132,204,22,0.3)' }}>Next Question →</button>
                </div>
            )}
        </div>
    );
}
