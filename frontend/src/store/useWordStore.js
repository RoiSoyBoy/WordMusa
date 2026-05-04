import { create } from 'zustand';
import wordsData from '../../assets/words.json';

// Convert the words array to an object for fast lookup O(1)
const dictionary = {};
wordsData.forEach(word => {
  if (word?.word) {
      dictionary[word.word.toLowerCase()] = word;
  }
});

const useWordStore = create((set, get) => ({
  dictionary,
  userProgress: {},
  activeWords: [],
  selectedWord: null,
  
  setActiveWords: (words) => set({ activeWords: words }),
  
  setSelectedWord: (wordData) => {
    set({ selectedWord: wordData });
  },

  closeModal: () => set({ selectedWord: null }),

  incrementEncounter: (wordStr) => set((state) => {
    return state;
  }),

  toggleReviewList: (wordStr) => set((state) => {
    return state;
  })
}));

export default useWordStore;
