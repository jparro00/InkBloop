INSERT INTO sim_profiles (psid, first_name, last_name, name, platform, profile_pic, instagram) VALUES
('igsid-c1', 'Sarah', 'Mitchell', 'Sarah Mitchell', 'instagram', null, '@sarahink_tn'),
('igsid-c2', 'Marcus', 'Rivera', 'Marcus Rivera', 'instagram', null, '@marcusriv'),
('psid-c3', 'Jen', 'Kowalski', 'Jen Kowalski', 'messenger', null, null),
('igsid-c4', 'Deshawn', 'Thompson', 'Deshawn Thompson', 'instagram', null, '@deshawn.t'),
('igsid-c5', 'Alyssa', 'Chen', 'Alyssa Chen', 'instagram', null, '@alyssachen.art'),
('psid-c6', 'Tyler', 'Brooks', 'Tyler Brooks', 'messenger', null, null),
('igsid-c7', 'Maria', 'Santos', 'Maria Santos', 'instagram', null, '@maria.s.art'),
('psid-c8', 'Jake', 'Donovan', 'Jake Donovan', 'messenger', null, null),
('igsid-4l0xl2cs', 'Josh', 'Parrott', 'Josh Parrott', 'instagram', null, null);

INSERT INTO sim_conversations (id, platform, participant_psid, updated_time, read_watermark) VALUES
('t_b19663b342da5073', 'instagram', 'igsid-4l0xl2cs', 1776128184203, 1776128166209),
('t_ccf5f4502d2cc2e1', 'instagram', 'igsid-c5', 1776127493786, 1776128087060),
('t_55c6e34e56cb2c0f', 'instagram', 'igsid-c7', 1776127139872, null),
('t_3573274d2e653ff9', 'messenger', 'psid-c8', 1775469900000, null),
('t_71ac6774b10b3bb7', 'messenger', 'psid-c3', 1775406600000, null),
('t_20c1174aec4bd963', 'messenger', 'psid-c6', 1775312100000, null),
('t_06c6ca3ed63955e6', 'instagram', 'igsid-c2', 1775210700000, null),
('t_1dcd09d26fdeac5d', 'instagram', 'igsid-c4', 1775128800000, null),
('t_5f2ac60997ce119c', 'instagram', 'igsid-c1', 1775054280000, null);

INSERT INTO sim_messages (mid, conversation_id, sender_id, recipient_id, text, attachments, timestamp, is_echo) VALUES
('m_Dv9VapQSgSSuHAfb-5xx7w', 't_b19663b342da5073', 'igsid-4l0xl2cs', '999888777666555', 'hey babe', null, 1776128118660, false),
('m_NvhSwwOhkCJUKlI2BY5EFg', 't_b19663b342da5073', 'igsid-4l0xl2cs', '999888777666555', 'you gonna tat me up?', null, 1776128133884, false),
('m_pJ8tN-vrOgey6AR4S7FsEw', 't_b19663b342da5073', '999888777666555', 'igsid-4l0xl2cs', 'wassup hommie', null, 1776128152241, true),
('m_acU6JPTuKr48XrBJ8azepA', 't_b19663b342da5073', 'igsid-4l0xl2cs', '999888777666555', 'you a fat ass milfy', null, 1776128161933, false),
('m_S0bl4rYkn6iVt53nFU9_xA', 't_b19663b342da5073', 'igsid-4l0xl2cs', '999888777666555', 'ha', null, 1776128184203, false),
('m_lwxLES951pYvPNgVay3rPA', 't_ccf5f4502d2cc2e1', 'igsid-c5', '999888777666555', 'hey', null, 1776127151880, false),
('m_G8Wti00ChsJHZGWG72uu8Q', 't_ccf5f4502d2cc2e1', 'igsid-c5', '999888777666555', 'hey', null, 1776127493786, false),
('m_BU-5nrCfPDPSuIFHk5HqEg', 't_3573274d2e653ff9', 'psid-c8', '111222333444555', 'Quick question — I had a reaction to red ink last time I got tattooed (not by you). Do you have alternative pigments that are safe for sensitive skin?', null, 1775467800000, false),
('m_jhp7Zta9zVV7036XN9TXcw', 't_3573274d2e653ff9', '111222333444555', 'psid-c8', 'Good question Jake. Yes, I use vegan inks and I have alternatives for red that work well for sensitive skin. I''ll note the allergy on your file. We can do a small patch test before any session if you want peace of mind.', null, 1775469600000, true),
('m_OzoxSBvgQEasZpQZRJylbQ', 't_3573274d2e653ff9', 'psid-c8', '111222333444555', 'That would be great. Let me know when works for the patch test.', null, 1775469900000, false),
('m_k9Du9QcWlp0DfON9EqMgNQ', 't_71ac6774b10b3bb7', 'psid-c3', '111222333444555', 'Hi! Sarah Mitchell referred me. My best friend and I want matching tattoos — something small and meaningful. Are you taking new clients?', null, 1775406600000, false),
('m_1Pn-HoNcGjXCn1T6kfLX_A', 't_20c1174aec4bd963', 'psid-c6', '111222333444555', 'Hi there, I want a full color koi fish on my calf. What would something like that run price-wise? Budget is around $800.', null, 1775307600000, false),
('m_IN3cNafsy4hNGKL9g5DRHw', 't_20c1174aec4bd963', '111222333444555', 'psid-c6', 'Hey Tyler! A full color koi on the calf would probably be 2-3 sessions depending on detail. $800 is a solid starting point — we can talk design and nail down the exact scope. Want to book a consultation?', null, 1775312100000, true),
('m_l5YxQwt17aJ__QsGD7NZHQ', 't_06c6ca3ed63955e6', 'igsid-c2', '999888777666555', 'Yo, ready to continue the half-sleeve whenever you are. Same Japanese style.', null, 1775207700000, false),
('m_VNc0UzzG8zZ3FSOKVvE_Iw', 't_06c6ca3ed63955e6', '999888777666555', 'igsid-c2', 'Marcus! Let''s do it. I was thinking we extend the koi down to the elbow next. Want to come in for a quick layout session first?', null, 1775210400000, true),
('m_pm0Wx8XUSPJh8dJc6OCS7Q', 't_06c6ca3ed63955e6', 'igsid-c2', '999888777666555', 'Yeah that works. Just remember — nitrile gloves only, latex allergy.', null, 1775210700000, false),
('m_yrgNk6mPHZDtI56z5o1Tvw', 't_1dcd09d26fdeac5d', 'igsid-c4', '999888777666555', 'Hey, I need a cover-up on my right shoulder. Old tribal piece. Think you can work with it?', null, 1775127600000, false),
('m_GlBb5DWzwzobp6GXdikyoQ', 't_1dcd09d26fdeac5d', '999888777666555', 'igsid-c4', 'Hey Deshawn! Yeah I do cover-ups. Can you send me a clear photo of the current piece? I''ll need to see the size and how dark the ink is.', null, 1775128800000, true),
('m_5KBdjjXMzcCiGW3aoLwaYA', 't_5f2ac60997ce119c', 'igsid-c1', '999888777666555', 'Hey! I saw your florals on IG and I love them. Do you have any openings this month?', null, 1775053320000, false),
('m_Vm4G-t7UF8ebSPzDpmqMFw', 't_5f2ac60997ce119c', '999888777666555', 'igsid-c1', 'Hi Sarah! Thanks so much 🙏 I have a few slots mid-April. What size were you thinking?', null, 1775054100000, true),
('m_3fUXwfdEdDzSbY7A0JcJ-g', 't_5f2ac60997ce119c', 'igsid-c1', '999888777666555', 'Something small, under 3 inches. Fine line on my inner wrist. Can I send you a reference pic?', null, 1775054280000, false);

