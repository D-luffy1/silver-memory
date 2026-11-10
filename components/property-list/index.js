Component({
  externalClasses: ['wr-class'],

  properties: {
    list: {
      type: Array,
      value: [],
    },
    /** 卡片形态，透传给 property-card：grid | row | slide */
    variant: {
      type: String,
      value: 'grid',
    },
    showFavorite: {
      type: Boolean,
      value: true,
    },
    /** row 形态下右侧按钮文案，传空则不展示 */
    actionText: {
      type: String,
      value: '',
    },
  },

  methods: {
    onCardClick(e) {
      this.triggerEvent('click', e.detail);
    },

    onCardThumb(e) {
      this.triggerEvent('thumb', e.detail);
    },

    onCardFavorite(e) {
      this.triggerEvent('favorite', e.detail);
    },

    onCardAction(e) {
      this.triggerEvent('action', e.detail);
    },
  },
});
