import unittest

from app.languages import language_name, voice_id_for


class LanguageTest(unittest.TestCase):
    def test_button_labels_map_to_the_five_gradium_languages(self):
        self.assertEqual(language_name("en"), "English")
        self.assertEqual(language_name("fr"), "French")
        self.assertEqual(language_name("de"), "German")
        self.assertEqual(language_name("es"), "Spanish")
        self.assertEqual(language_name("pt"), "Portuguese")

    def test_each_language_uses_its_own_heard_voice(self):
        env = {
            "GRADIUM_VOICE_ID": "english-fallback",
            "GRADIUM_VOICE_ID_EN": "english-heard",
            "GRADIUM_VOICE_ID_FR": "french-heard",
            "GRADIUM_VOICE_ID_DE": "german-heard",
            "GRADIUM_VOICE_ID_GR": "old-label",
        }
        self.assertEqual(voice_id_for(env, "en"), "english-heard")
        self.assertEqual(voice_id_for(env, "fr"), "french-heard")
        self.assertEqual(voice_id_for(env, "de"), "german-heard")
        self.assertEqual(voice_id_for(env, "es"), "")
        self.assertEqual(voice_id_for({"GRADIUM_VOICE_ID": "english-fallback"}, "en"), "english-fallback")
