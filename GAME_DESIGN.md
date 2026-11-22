# SUPER CAPYBARA: POLICE DETECTIVE: game design

Ethan's (age 9) 4th game, after SuperCapybara, SupaCapy 2 and SuperCapybara 3. Every decision he makes goes here.

## The first questions (2026-11-22, designed in the SuperCapybara session)
- Ethan's new game idea: SuperCapybara as a **police detective**.
- The opening (Ethan): a **black screen**, and letters type out one by one: **"STEALING DU..."**. Right at the "DU" part, before "DUDES" is finished, **a poster slams over everything** that says **"SUPER CAPYBARA POLICE DETECTIVE"** (the detective interrupts the bad guys' title).
- Q1 (2026-11-22): it's a **whole separate game** (its own folder and title screen, like SupaCapy 2), not a mode inside SuperCapybara. Dad helps set up the new project. Move these notes into its own GAME_DESIGN.md once it exists.
- Q2 (2026-11-22): it's a **3D detective mystery**: walk around crime scenes, find clues 🔍, talk to people, figure out WHO stole it, then catch them.
- Q3 (2026-11-22): it gets **its own address, localhost:5176**. SupaCapy 2 stays at 5175, untouched.
- Q4 (2026-11-22): a **team**: **SuperCapybara the detective** figures everything out (clues), and **Copybara** the police capybara is the partner. Press **Q to switch** between them anytime, like switching heroes in THE BAD GUY KING story mode.
- Q5 (2026-11-22): **SuperCapybara** finds clues 🔍 (his magnifying glass makes hidden clues glow) and **asks people questions** 💬. **Copybara** **catches bad guys** 🚓 (handcuffs, fast run and tackle), **opens locked doors** 🔑 and **drives the police car**. You need both, so you switch a lot.
- Q6 (2026-11-22): the first case: **The Golden Bolt** ⚡ is stolen from the **city museum** (broken glass, muddy footprints, guards to ask...).
- Ethan: there should be **2 PLAYERS** (one plays SuperCapybara, one plays Copybara?) **but LATER**, not in the first version.
- Q7 (2026-11-22): the thief is **the museum guard** (a twist!). He acts nice and says "I saw nothing!", but the clues point to him. (Secret: don't show it before the end of the case.)
- Q8 (2026-11-22): the clues: **muddy footprints** 👣 matching the guard's boots and a **ripped piece of his uniform** on the broken glass (SuperCapybara finds them), the **security camera video** 📹 showing a shadow with the guard's hat (Copybara unlocks the camera room), plus **fake clues** that trick you (like a banana peel pointing to a monkey 🐒 who didn't do it).
- Q9 (2026-11-22): solving it: **accuse, then chase**. Line up the suspects (the guard, the monkey, a visitor...) and point: "IT WAS YOU!" (wrong = "Not enough proof!", keep looking). The guard yells "You'll never catch me!" and runs; **Copybara chases him through the city in the police car** 🚔 and arrests him.
- Q10 (2026-11-22): the game's name is **SUPER CAPYBARA: POLICE DETECTIVE** (like the poster).

## Built (2026-11-22, version 1)

- **Opening = title screen:** a black screen with a little ▶; any key or tap starts it (so the sound can play). "STEALING DU" types out letter by letter with typewriter clicks, and at "DU" the poster **SLAMS** onto the screen (BAM sound, screen shake), tilted, with police tape and SuperCapybara with his detective hat and magnifying glass. Then "PRESS ENTER OR TAP TO START" and ENGLISH / DEUTSCH buttons. (German types "DIEBESBA...".)
- **Case 1, the museum (3D):** the big hall with the Golden Bolt's smashed glass case (a "?" floating where it was), velvet ropes, a dinosaur skeleton, a capybara statue, paintings, benches, a red carpet, and the locked **STAFF ONLY** door to the camera room (security monitors, a locker with a guard hat on it).
- **The team:** SuperCapybara (red suit, detective coat and hat, magnifying glass) and Copybara (blue police suit, gold badge, police cap, handcuffs). **Q** switches; the other one follows you. Clues **sparkle** only when SuperCapybara is close (his magnifying glass). SuperCapybara looks at clues and talks to people; Copybara opens the locked door (and is faster).
- **People:** Museum Director Owl (gives you the case at the start; come back to accuse), Guard Bulldog (the thief: muddy boots, a ripped sleeve, "I saw NOTHING!"), Monkey, Sheep (with a camera). What they say changes with the clues you found.
- **Clues (5):** 👣 muddy footprints to the staff door, 🧵 ripped uniform on the glass, 📹 camera video (shadow with a guard hat), and fake ones: 🍌 banana peel, 🐑 white wool. **N** = the detective notebook.
- **Accuse:** talk to the director with 3+ clues: the line-up (Monkey, Guard Bulldog, Sheep). Wrong = "the clues don't point to them!"; the guard without all 3 real clues = "not enough proof!". Right = "IT WAS YOU, GUARD BULLDOG!", he runs off ("You'll NEVER catch me!"), sirens, and **TO BE CONTINUED: the police car chase**.
- Sneaky detective music (walking bass), all sounds made in code. English and German. iPad: a joystick, X and 🔄 buttons (not tried on a real iPad yet).

## The police car chase (designed 2026-11-22)

- Q11: the chase goes **through the city streets first** (past cars, fruit stands, around corners) in the police car, **then to the harbor**, where Guard Bulldog escapes on a **boat** 🚤. Ethan: **capybaras swim really well**, so Copybara **dives in and swims after the boat**! 🦫🌊
- Q12: the catch: the boat **runs out of gas** ⛽, Guard Bulldog has to **swim** too, and Copybara is **faster in the water** and catches him (CLICK, handcuffs).
- Q13: the city part is tricky because of **things in the road** to steer around: cars, **fruit stands** (crash = fruit flies everywhere 🍉) and boxes. No timer.
- Q14: the police car has a **SIREN button** 🚨: press it and the cars in the road move out of the way (WEE-OO!).
- Q20: the **police radio is Baby Capybara** 🍼📻, trying to sound like a cop, in baby talk. Ethan's line: **"Ba ba there, waaaaah, getting awawaway!"**
- Ethan: the chase is **3D** too, like the whole game (the museum is already 3D).
- Q15: you drive from **inside the police car**: through the windshield, with Copybara's paws on the steering wheel.
- Q16: inside the car there's **everything**: the steering wheel and paws, a **dashboard** (speed meter, a blinking 🚨 siren light), a **police radio** that talks ("All units, the suspect is heading to the harbor!"), and **SuperCapybara in the passenger seat** shouting tips ("Watch out, a fruit stand!").
- Q17: swimming stays **first person** too: you see Copybara's paws paddling, the boat ahead, and splashes. 🦫💨
- Q18: the ending: Guard Bulldog goes to **jail** (bars drop down, he says "I'll be back!"), then the **medal party** at the museum (the Golden Bolt goes back in a new glass case, everyone cheers, the owl gives you **detective medals** 🏅), and then the police radio crackles: **"Detectives! A new case!"** 📻

## Case 2 (idea, 2026-11-22)

- Q19: **The Missing Pizza Chef** 🍕: the city's best pizza chef has vanished, and his pizza shop is a mess. Ethan wants it **like the "Three Investigators" books** (Die drei ???): a real puzzle mystery with tricky clues, suspects with secrets and a clever twist. Our own story and characters, inspired by that style, not copied.

**Chase built (2026-11-22):** accusing the guard → "Copybara, to the police car!" → **the city chase**, first person inside the police car (steering wheel with Copybara's paws, dashboard with a km/h meter, a blinking siren light, the radio, SuperCapybara in the passenger seat). ↑ gas, ← → steer, ↓ brake, **SPACE (or 🚨 on the iPad) = siren**: the cars ahead pull over and stop. Traffic, fruit stands (SPLAT, fruit flies everywhere) and boxes to dodge; SuperCapybara's tips pop up ("Watch out, a fruit stand!", "Car ahead! Use the siren!"); Baby Capybara on the radio says Ethan's line. Guard Bulldog drives the white MUSEUM van ahead of you (the distance is at the top right). At the end of the road, the **harbor**: he jumps onto a boat, Copybara **dives in**, and you **swim** first person (paws paddling, splashes). After 6 seconds the boat **runs out of gas** (putt putt), he has to swim, and you're faster; close to him, Copybara aims by himself → **CLICK, GOTCHA!** → **jail** (bars slam down, "I'll be back! Grrr!") → the **medal party** at the museum (Golden Bolt back in its case, medals, confetti, cheering) → the radio: "Detectives! A NEW CASE! Pizza chef... GONE!" → THE END OF CASE 1 → back to the title.

- Case 2, Q1 (2026-11-22): the missing pizza chef is **Chef Mozzarella**, a fancy **cat** 🐱, and **she's a girl** (not a boy). She wears a **curly mustache**.
- Case 2, Q2 (Ethan): the first clue at the pizza shop: **she left her mustache behind** 🥸 (so it must be a stick-on mustache; why did she take it off?).
- Case 2, Q3 (Ethan): **somebody STOLE the chef** (kidnapped!). She didn't leave by herself, so the mustache fell off in a struggle. (Ethan didn't pick A, B or C: the mystery is who took her, and why.)
- Case 2, Q4: the kidnapper is **Pizza Boss** 🍕 (the big bad guy from SuperCapybara): he wants her **secret recipe for his pizza army**.
- Case 2, Q5: **fake suspects first** (the rival chef and the pizza delivery guy), then the twist: it was **Pizza Boss in disguise** all along. Ethan: the chef is hidden **in the sewers** 🕳️ (that's where the detectives find her at the end).
- Case 2, Q6: the sewer has **two parts**: first **dark tunnels** with a smelly river (flashlight, follow the smell of pizza 🍕), then a door that opens into **Pizza Boss's secret pizza factory** 🏭 (conveyor belts, giant ovens, robots) where the chef is kept.
- Case 2, Q7 (Ethan): the sewer tunnels are a **MAZE RUN**, and **SuperCapybara the detective** goes through it, because he's smart and **knows mazes very well** (Copybara can't do mazes as well).
- Case 2, Q8: beating Pizza Boss in the factory: **both work together**: SuperCapybara tricks him (his own pizza machine covers him in dough 🍕) and Copybara slaps on the handcuffs while he's stuck.
- Case 2, Q9: the clues. **Fake clues:** pizza sauce on the rival chef's apron (from his own pizzas), the delivery guy's scooter seen near the shop 🛵, and an **angry note** from the rival chef ("I'll get you!") that's really about a cooking contest. **Real clues** (lead underground): flour, a **giant footprint** and a pizza smell.
- Case 2, Q10 (Ethan's own idea): case 2 starts **right after case 1**: the detectives **walk from the museum to the pizza place to celebrate**, but when they get there **she's gone**! (The "new case" radio call at the end of case 1 can lead into this.)
- Case 2, Q11: after case 1's party you go to the **title screen**, where a **CASE 2** button waits for you (case 1 stays playable).


**Case 2 built (2026-11-22):** the title screen has **CASE 1** and **CASE 2** buttons (case 2 is 🔒 until case 1 is solved; ← → picks, ENTER starts).
- **The town:** you start in front of the museum and walk down the street (goal: "Walk to Chef Mozzarella's pizza shop to celebrate!"). Pesto Palace with Chef Pesto (a green parrot) is on the right; the café table with a "normal customer" in a trench coat, hat and sunglasses (spiky feet sticking out...) and Danny Dough (a delivery raccoon) with his scooter are on the left. Walking into **MOZZARELLA'S PIZZA**: "CHEF MOZZARELLA IS GONE!" Waiter Mouse explains and is the one you tell who did it.
- **Clues:** real: 🥸 the mustache on the floor, 👣 floury footprints to the locked back door (Copybara opens it), 🦶 the GIANT spiky footprint and 🍕 the pizza smell from the open manhole in the alley. Fake: 🍅 Chef Pesto's saucy apron, 🛵 the scooter, 📝 the angry note ("I'll GET you" = the cooking contest).
- **Accuse** the customer → the disguise flies off: **PIZZA BOSS!** "You'll NEVER find the chef!" He runs through the shop and jumps down the manhole.
- **The sewer maze:** only SuperCapybara (Copybara guards the manhole). Dark brick tunnels with a flashlight, a green slime river, dripping pipes, and **orange pizza-smell blobs** along the right way to the round pizza door.
- **The factory:** conveyor belts with pizzas, ovens, pizza robots, Chef Mozzarella in a cage (without her mustache!), and Pizza Boss under the **DOUGH MACHINE**. SuperCapybara pulls the lever: SPLAT, Pizza Boss is stuck in a giant dough blob. Copybara bursts in (you switch to him), handcuffs Pizza Boss, and opens the cage. The chef gets her **mustache back** ("Oh la la!").
- **The pizza party** at the shop: everybody (even Chef Pesto and Danny Dough), confetti, "Free pizza for the detectives, FOREVER!", and Baby Capybara on the radio: "More cases... soon!"

## Next

- Case 3 (Ethan picks the idea).
- iPad test on the real iPad.
- 2 PLAYERS (one plays SuperCapybara, one Copybara), later (Ethan).
