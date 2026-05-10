import { create } from 'zustand';

const useWordStore = create((set, get) => ({
  userProgress: {},
  activeWords: [],
  selectedWord: null,
  
  setActiveWords: (words) => set({ activeWords: words }),
  
  setSelectedWord: (wordData) => {
    set({ selectedWord: wordData });
  },

  closeModal: () => set({ selectedWord: null }),

  incrementEncounter: (wordStr) => set((state) => {
    const prev = state.userProgress[wordStr] || { encounterCount: 0 };
    return {
      userProgress: {
        ...state.userProgress,
        [wordStr]: { ...prev, encounterCount: prev.encounterCount + 1 },
      },
    };
  }),

  toggleReviewList: (wordStr) => set((state) => {
    const prev = state.userProgress[wordStr] || {};
    return {
      userProgress: {
        ...state.userProgress,
        [wordStr]: { ...prev, savedToReview: !prev.savedToReview },
      },
    };
  })
}));

export default useWordStore;
