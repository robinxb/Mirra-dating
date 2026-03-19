import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type Screen = 'welcome' | 'questions' | 'complete' | 'chat' | 'match' | 'profile';

type Question = {
  id: keyof Answers;
  label: string;
  helper: string;
  type: 'text' | 'choice';
  placeholder?: string;
  options?: string[];
};

type Answers = {
  firstName: string;
  city: string;
  relationshipGoal: string;
  communicationStyle: string;
  partnerValue: string;
};

type ChatMessage = {
  id: number;
  role: 'ai' | 'user';
  text: string;
};

type Profile = {
  photoUri: string | null;
  bio: string;
  lookingForAgeRange: string;
};

const questions: Question[] = [
  {
    id: 'firstName',
    label: 'What should Mirra call you?',
    helper: 'A first name or nickname is enough.',
    type: 'text',
    placeholder: 'Alex',
  },
  {
    id: 'city',
    label: 'Where are you based right now?',
    helper: 'This helps Mirra keep distance and lifestyle realistic.',
    type: 'text',
    placeholder: 'London, New York, Singapore...',
  },
  {
    id: 'relationshipGoal',
    label: 'What are you looking for?',
    helper: 'Pick the closest match for your current season.',
    type: 'choice',
    options: ['Long-term relationship', 'Serious dating', 'Open to exploring'],
  },
  {
    id: 'communicationStyle',
    label: 'How do you like to connect?',
    helper: 'Choose the pace that feels natural to you.',
    type: 'choice',
    options: ['Warm and consistent', 'Playful and spontaneous', 'Deep and intentional'],
  },
  {
    id: 'partnerValue',
    label: 'What value matters most in a partner?',
    helper: 'One short phrase is enough.',
    type: 'text',
    placeholder: 'Kindness, ambition, emotional maturity...',
  },
];

const defaultAnswers: Answers = {
  firstName: '',
  city: '',
  relationshipGoal: '',
  communicationStyle: '',
  partnerValue: '',
};

const starterPrompts = [
  'Help me write a better dating profile.',
  'What kind of person should I meet first?',
  'Ask me three deeper questions before matching.',
];

export default function App() {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [answers, setAnswers] = useState<Answers>(defaultAnswers);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [draftAnswer, setDraftAnswer] = useState('');
  const [profile, setProfile] = useState<Profile>({
    photoUri: null,
    bio: '',
    lookingForAgeRange: '27-36',
  });
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: 'ai',
      text: 'Hi, I am Mirra. I will learn what matters to you, then help you meet someone who feels aligned.',
    },
  ]);

  const currentQuestion = questions[questionIndex];
  const firstName = answers.firstName.trim() || 'there';
  const onboardingDone = questions.every((question) => answers[question.id].trim().length > 0);

  const matchProfile = useMemo(
    () => buildMatchProfile(answers, profile),
    [answers, profile],
  );

  const progress = ((questionIndex + 1) / questions.length) * 100;

  function startQuestions() {
    setQuestionIndex(0);
    setDraftAnswer(answers[questions[0].id]);
    setScreen('questions');
  }

  function handleChoiceSelect(value: string) {
    setAnswers((previous) => ({ ...previous, [currentQuestion.id]: value }));

    if (questionIndex === questions.length - 1) {
      finishOnboarding({
        ...answers,
        [currentQuestion.id]: value,
      });
      return;
    }

    const nextIndex = questionIndex + 1;
    setQuestionIndex(nextIndex);
    setDraftAnswer(answers[questions[nextIndex].id]);
  }

  function handleNextQuestion() {
    const value = draftAnswer.trim();

    if (!value) {
      Alert.alert('Answer required', 'Please add a quick answer before continuing.');
      return;
    }

    const nextAnswers = { ...answers, [currentQuestion.id]: value };
    setAnswers(nextAnswers);

    if (questionIndex === questions.length - 1) {
      finishOnboarding(nextAnswers);
      return;
    }

    const nextIndex = questionIndex + 1;
    setQuestionIndex(nextIndex);
    setDraftAnswer(nextAnswers[questions[nextIndex].id]);
  }

  function finishOnboarding(nextAnswers: Answers) {
    setAnswers(nextAnswers);
    setProfile((previous) => ({
      ...previous,
      bio:
        previous.bio ||
        `${nextAnswers.relationshipGoal}. Based in ${nextAnswers.city}. Looking for ${nextAnswers.partnerValue.toLowerCase()} and ${nextAnswers.communicationStyle.toLowerCase()} chemistry.`,
    }));
    setChatMessages([
      {
        id: 1,
        role: 'ai',
        text: `Hi ${nextAnswers.firstName || 'there'}, I have your first preferences. You can refine your profile with me, or jump straight into matching.`,
      },
    ]);
    setScreen('complete');
  }

  async function pickImage() {
    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Permission needed', 'Photo access is required to choose a profile picture.');
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setProfile((previous) => ({ ...previous, photoUri: result.assets[0].uri }));
    }
  }

  function sendChatMessage(message?: string) {
    const trimmed = (message ?? chatInput).trim();

    if (!trimmed) {
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: 'user',
      text: trimmed,
    };

    const aiReply: ChatMessage = {
      id: Date.now() + 1,
      role: 'ai',
      text: generateAiReply(trimmed, answers, profile),
    };

    setChatMessages((previous) => [...previous, userMessage, aiReply]);
    setChatInput('');
    setScreen('chat');
  }

  const renderHeader = () => (
    <View style={styles.header}>
      <View>
        <Text style={styles.brand}>Mirra</Text>
        <Text style={styles.headerTitle}>Find the right person, faster.</Text>
      </View>
      {onboardingDone ? (
        <Pressable style={styles.secondaryGhostButton} onPress={() => setScreen('profile')}>
          <Text style={styles.secondaryGhostButtonText}>Profile</Text>
        </Pressable>
      ) : null}
    </View>
  );

  const renderTabs = () => {
    if (!onboardingDone) {
      return null;
    }

    const tabs: { key: Screen; label: string }[] = [
      { key: 'chat', label: 'AI Coach' },
      { key: 'match', label: 'Match' },
      { key: 'profile', label: 'Profile' },
    ];

    return (
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setScreen(tab.key)}
            style={[styles.tab, screen === tab.key && styles.activeTab]}
          >
            <Text style={[styles.tabText, screen === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.appShell}>
        {renderHeader()}
        {renderTabs()}

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {screen === 'welcome' && (
            <View style={styles.heroCard}>
              <Text style={styles.eyebrow}>AI-guided dating</Text>
              <Text style={styles.heroTitle}>A cleaner first step to meeting your person.</Text>
              <Text style={styles.heroText}>
                Mirra learns who you are in five quick answers, shapes your profile, and helps you
                move from intention to a real match.
              </Text>

              <View style={styles.featureGrid}>
                <View style={styles.featureCard}>
                  <Text style={styles.featureNumber}>5</Text>
                  <Text style={styles.featureLabel}>simple questions</Text>
                </View>
                <View style={styles.featureCard}>
                  <Text style={styles.featureNumber}>AI</Text>
                  <Text style={styles.featureLabel}>conversation support</Text>
                </View>
                <View style={styles.featureCard}>
                  <Text style={styles.featureNumber}>1</Text>
                  <Text style={styles.featureLabel}>focused soulmate match</Text>
                </View>
              </View>

              <Pressable style={styles.primaryButton} onPress={startQuestions}>
                <Text style={styles.primaryButtonText}>Start with 5 questions</Text>
              </Pressable>
            </View>
          )}

          {screen === 'questions' && (
            <View style={styles.sectionCard}>
              <View style={styles.progressRow}>
                <Text style={styles.progressText}>
                  Question {questionIndex + 1} of {questions.length}
                </Text>
                <Text style={styles.progressText}>{Math.round(progress)}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>

              <Text style={styles.questionTitle}>{currentQuestion.label}</Text>
              <Text style={styles.questionHelper}>{currentQuestion.helper}</Text>

              {currentQuestion.type === 'text' ? (
                <>
                  <TextInput
                    value={draftAnswer}
                    onChangeText={setDraftAnswer}
                    placeholder={currentQuestion.placeholder}
                    placeholderTextColor="#8E8A82"
                    style={[styles.input, currentQuestion.id === 'partnerValue' && styles.multilineInput]}
                    multiline={currentQuestion.id === 'partnerValue'}
                  />
                  <Pressable style={styles.primaryButton} onPress={handleNextQuestion}>
                    <Text style={styles.primaryButtonText}>
                      {questionIndex === questions.length - 1 ? 'Finish setup' : 'Continue'}
                    </Text>
                  </Pressable>
                </>
              ) : (
                <View style={styles.choiceList}>
                  {currentQuestion.options?.map((option) => (
                    <Pressable
                      key={option}
                      style={styles.choiceCard}
                      onPress={() => handleChoiceSelect(option)}
                    >
                      <Text style={styles.choiceText}>{option}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          )}

          {screen === 'complete' && (
            <View style={styles.sectionCard}>
              <Text style={styles.eyebrow}>Profile started</Text>
              <Text style={styles.sectionTitle}>You are in, {firstName}.</Text>
              <Text style={styles.sectionText}>
                Mirra has enough signal to begin coaching and matching. You can chat with AI to
                refine your profile, or jump directly to your first soulmate preview.
              </Text>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Current vibe</Text>
                <Text style={styles.summaryItem}>Based in {answers.city}</Text>
                <Text style={styles.summaryItem}>{answers.relationshipGoal}</Text>
                <Text style={styles.summaryItem}>{answers.communicationStyle}</Text>
                <Text style={styles.summaryItem}>Values {answers.partnerValue.toLowerCase()}</Text>
              </View>

              <Pressable style={styles.primaryButton} onPress={() => setScreen('chat')}>
                <Text style={styles.primaryButtonText}>Continue with AI</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={() => setScreen('match')}>
                <Text style={styles.secondaryButtonText}>Start matching now</Text>
              </Pressable>
            </View>
          )}

          {screen === 'chat' && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>AI dating coach</Text>
              <Text style={styles.sectionText}>
                Ask Mirra for profile edits, better prompts, or a sharper read on your ideal match.
              </Text>

              <View style={styles.promptRow}>
                {starterPrompts.map((prompt) => (
                  <Pressable
                    key={prompt}
                    style={styles.promptChip}
                    onPress={() => sendChatMessage(prompt)}
                  >
                    <Text style={styles.promptChipText}>{prompt}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.chatList}>
                {chatMessages.map((message) => (
                  <View
                    key={message.id}
                    style={[
                      styles.chatBubble,
                      message.role === 'user' ? styles.userBubble : styles.aiBubble,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chatRole,
                        message.role === 'user' ? styles.userBubbleText : styles.aiBubbleText,
                      ]}
                    >
                      {message.role === 'user' ? 'You' : 'Mirra'}
                    </Text>
                    <Text
                      style={[
                        styles.chatText,
                        message.role === 'user' ? styles.userBubbleText : styles.aiBubbleText,
                      ]}
                    >
                      {message.text}
                    </Text>
                  </View>
                ))}
              </View>

              <TextInput
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Ask Mirra anything about your dating profile or next match..."
                placeholderTextColor="#8E8A82"
                style={[styles.input, styles.multilineInput]}
                multiline
              />
              <Pressable style={styles.primaryButton} onPress={() => sendChatMessage()}>
                <Text style={styles.primaryButtonText}>Send</Text>
              </Pressable>
            </View>
          )}

          {screen === 'match' && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Soulmate preview</Text>
              <Text style={styles.sectionText}>
                A simple MVP card based on your current answers. In the real product, this would be
                generated from the match engine and conversation history.
              </Text>

              <View style={styles.matchCard}>
                <Text style={styles.matchBadge}>Best fit right now</Text>
                <Text style={styles.matchName}>{matchProfile.name}</Text>
                <Text style={styles.matchMeta}>
                  {matchProfile.age} • {matchProfile.city}
                </Text>
                <Text style={styles.matchDescription}>{matchProfile.description}</Text>

                <View style={styles.matchTraitRow}>
                  {matchProfile.traits.map((trait) => (
                    <View key={trait} style={styles.matchTrait}>
                      <Text style={styles.matchTraitText}>{trait}</Text>
                    </View>
                  ))}
                </View>

                <Pressable style={styles.primaryButton} onPress={() => setScreen('chat')}>
                  <Text style={styles.primaryButtonText}>Ask AI why this match fits</Text>
                </Pressable>
              </View>
            </View>
          )}

          {screen === 'profile' && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Your profile</Text>
              <Text style={styles.sectionText}>
                Keep this simple for now. The MVP stores it locally inside the app session.
              </Text>

              <View style={styles.profileHero}>
                {profile.photoUri ? (
                  <Image source={{ uri: profile.photoUri }} style={styles.profilePhoto} />
                ) : (
                  <View style={styles.profilePhotoPlaceholder}>
                    <Text style={styles.profilePhotoPlaceholderText}>
                      {answers.firstName.trim().slice(0, 1) || 'M'}
                    </Text>
                  </View>
                )}

                <View style={styles.profileMeta}>
                  <Text style={styles.profileName}>{firstName}</Text>
                  <Text style={styles.profileSubline}>{answers.city || 'Location not set yet'}</Text>
                </View>
              </View>

              <Pressable style={styles.secondaryButton} onPress={pickImage}>
                <Text style={styles.secondaryButtonText}>Upload profile photo</Text>
              </Pressable>

              <Text style={styles.fieldLabel}>Short bio</Text>
              <TextInput
                value={profile.bio}
                onChangeText={(bio) => setProfile((previous) => ({ ...previous, bio }))}
                placeholder="Curious, warm, and looking for something real."
                placeholderTextColor="#8E8A82"
                style={[styles.input, styles.multilineInput]}
                multiline
              />

              <Text style={styles.fieldLabel}>Preferred age range</Text>
              <TextInput
                value={profile.lookingForAgeRange}
                onChangeText={(lookingForAgeRange) =>
                  setProfile((previous) => ({ ...previous, lookingForAgeRange }))
                }
                placeholder="27-36"
                placeholderTextColor="#8E8A82"
                style={styles.input}
              />
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function generateAiReply(input: string, answers: Answers, profile: Profile) {
  const lowered = input.toLowerCase();

  if (lowered.includes('profile')) {
    return `Try this profile line: "${answers.firstName || 'I'} am building something real in ${answers.city || 'my city'}, and I am drawn to ${answers.partnerValue || 'kind, grounded people'}." Keep it direct and warm.`;
  }

  if (lowered.includes('match')) {
    return `Your strongest filters right now are ${answers.relationshipGoal || 'clarity'}, ${answers.communicationStyle || 'steady communication'}, and ${answers.partnerValue || 'shared values'}. I would prioritize people who signal consistency early.`;
  }

  if (lowered.includes('question')) {
    return 'Here are three better questions for a first conversation: What does a calm weekend look like for you? What are you intentionally building this year? How do you know when you feel safe with someone?';
  }

  return `You come across as someone looking for ${answers.relationshipGoal || 'real connection'} with ${answers.communicationStyle || 'good energy'}. I would sharpen your profile around ${answers.partnerValue || 'your strongest value'} and keep your bio under 3 lines. ${profile.bio ? 'Your current bio already gives me useful signal.' : 'Adding a short bio will improve your first matches.'}`;
}

function buildMatchProfile(answers: Answers, profile: Profile) {
  const city = answers.city.trim() || 'your area';
  const value = answers.partnerValue.trim() || 'emotional maturity';
  const relationshipGoal = answers.relationshipGoal.trim() || 'serious dating';
  const style = answers.communicationStyle.trim() || 'deep and intentional';
  const ageRange = profile.lookingForAgeRange || '27-36';
  const ageStart = Number(ageRange.split('-')[0]) || 29;

  return {
    name: 'Sophie Bennett',
    age: ageStart + 2,
    city,
    description: `Sophie is oriented toward ${relationshipGoal.toLowerCase()}, communicates in a ${style.toLowerCase()} way, and tends to notice ${value.toLowerCase()} very quickly. She likes direct plans, warm energy, and people who mean what they say.`,
    traits: [relationshipGoal, style, value],
  };
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4EFE7',
  },
  appShell: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    color: '#9C5C3D',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headerTitle: {
    color: '#1E2430',
    fontSize: 22,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
    gap: 18,
  },
  heroCard: {
    backgroundColor: '#FFFDF9',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E4D7C8',
    gap: 18,
  },
  eyebrow: {
    color: '#9C5C3D',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#1E2430',
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '700',
  },
  heroText: {
    color: '#5B5E67',
    fontSize: 16,
    lineHeight: 24,
  },
  featureGrid: {
    gap: 12,
  },
  featureCard: {
    backgroundColor: '#F8F1E8',
    borderRadius: 20,
    padding: 18,
  },
  featureNumber: {
    color: '#1E2430',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  featureLabel: {
    color: '#5B5E67',
    fontSize: 15,
  },
  sectionCard: {
    backgroundColor: '#FFFDF9',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E4D7C8',
    gap: 16,
  },
  sectionTitle: {
    color: '#1E2430',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
  },
  sectionText: {
    color: '#5B5E67',
    fontSize: 16,
    lineHeight: 24,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    color: '#6E675E',
    fontSize: 14,
    fontWeight: '600',
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#EFE5D8',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#9C5C3D',
  },
  questionTitle: {
    color: '#1E2430',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
  },
  questionHelper: {
    color: '#5B5E67',
    fontSize: 16,
    lineHeight: 24,
  },
  input: {
    backgroundColor: '#F8F4EE',
    color: '#1E2430',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E4D7C8',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  choiceList: {
    gap: 12,
  },
  choiceCard: {
    borderRadius: 20,
    padding: 18,
    backgroundColor: '#F8F1E8',
    borderWidth: 1,
    borderColor: '#E4D7C8',
  },
  choiceText: {
    color: '#1E2430',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: '#1E2430',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    color: '#FFFDF9',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: '#EFE5D8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  secondaryButtonText: {
    color: '#1E2430',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryGhostButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D7C5B2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFDF9',
  },
  secondaryGhostButtonText: {
    color: '#1E2430',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#F8F4EE',
    borderRadius: 22,
    padding: 18,
    gap: 8,
  },
  summaryTitle: {
    color: '#1E2430',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryItem: {
    color: '#5B5E67',
    fontSize: 15,
  },
  promptRow: {
    gap: 10,
  },
  promptChip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F1E7DB',
  },
  promptChipText: {
    color: '#433D36',
    fontSize: 14,
    fontWeight: '600',
  },
  chatList: {
    gap: 12,
  },
  chatBubble: {
    borderRadius: 22,
    padding: 16,
    gap: 6,
    maxWidth: '90%',
  },
  aiBubble: {
    backgroundColor: '#F4ECE2',
    alignSelf: 'flex-start',
  },
  userBubble: {
    backgroundColor: '#1E2430',
    alignSelf: 'flex-end',
  },
  chatRole: {
    fontSize: 13,
    fontWeight: '700',
  },
  chatText: {
    fontSize: 15,
    lineHeight: 22,
  },
  aiBubbleText: {
    color: '#1E2430',
  },
  userBubbleText: {
    color: '#FFFDF9',
  },
  matchCard: {
    backgroundColor: '#F8F1E8',
    borderRadius: 24,
    padding: 20,
    gap: 14,
  },
  matchBadge: {
    alignSelf: 'flex-start',
    color: '#9C5C3D',
    backgroundColor: '#FFF5EA',
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    fontWeight: '700',
    fontSize: 13,
  },
  matchName: {
    color: '#1E2430',
    fontSize: 30,
    fontWeight: '700',
  },
  matchMeta: {
    color: '#5B5E67',
    fontSize: 16,
  },
  matchDescription: {
    color: '#433D36',
    fontSize: 16,
    lineHeight: 24,
  },
  matchTraitRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  matchTrait: {
    backgroundColor: '#FFFDF9',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  matchTraitText: {
    color: '#1E2430',
    fontSize: 14,
    fontWeight: '600',
  },
  profileHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  profilePhoto: {
    width: 96,
    height: 96,
    borderRadius: 28,
  },
  profilePhotoPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: '#1E2430',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePhotoPlaceholderText: {
    color: '#FFFDF9',
    fontSize: 36,
    fontWeight: '700',
  },
  profileMeta: {
    flex: 1,
    gap: 4,
  },
  profileName: {
    color: '#1E2430',
    fontSize: 24,
    fontWeight: '700',
  },
  profileSubline: {
    color: '#5B5E67',
    fontSize: 15,
  },
  fieldLabel: {
    color: '#433D36',
    fontSize: 15,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#EDE2D5',
    borderRadius: 18,
    padding: 6,
    gap: 6,
  },
  tab: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#FFFDF9',
  },
  tabText: {
    color: '#5B5E67',
    fontSize: 14,
    fontWeight: '700',
  },
  activeTabText: {
    color: '#1E2430',
  },
});
