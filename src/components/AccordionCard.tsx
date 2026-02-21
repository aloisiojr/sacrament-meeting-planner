/**
 * AccordionCard: Expandable card system where exactly 1 card is expanded at a time.
 * Collapsed cards before expanded: stacked at top.
 * Collapsed cards after expanded: stacked at bottom.
 * All collapsed cards always visible. Expanded card fills remaining space with internal scroll.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- Types ---

export interface AccordionCardConfig {
  title: string;
  content: React.ReactNode;
}

export interface AccordionCardProps {
  cards: AccordionCardConfig[];
  initialExpanded?: number;
  cardTitleFontSize?: number;
}

// --- Constants ---

const COLLAPSED_HEIGHT = 48;

// --- Component ---

export function AccordionCard({ cards, initialExpanded = 0, cardTitleFontSize }: AccordionCardProps) {
  const { colors } = useTheme();
  const [expandedIndex, setExpandedIndex] = useState(initialExpanded);

  const handlePress = useCallback(
    (index: number) => {
      if (index === expandedIndex) return;
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpandedIndex(index);
    },
    [expandedIndex]
  );

  return (
    <View style={styles.container}>
      {cards.map((card, index) => {
        const isExpanded = index === expandedIndex;

        return (
          <View
            key={index}
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
              isExpanded && styles.expandedCard,
            ]}
          >
            <Pressable
              style={[
                styles.cardHeader,
                {
                  backgroundColor: isExpanded ? colors.primary : colors.surfaceVariant,
                },
              ]}
              onPress={() => handlePress(index)}
              accessibilityRole="button"
              accessibilityState={{ expanded: isExpanded }}
            >
              <Text
                style={[
                  styles.cardTitle,
                  { color: isExpanded ? colors.onPrimary : colors.text, fontSize: cardTitleFontSize ?? 16 },
                ]}
                numberOfLines={1}
              >
                {card.title}
              </Text>
              {!isExpanded && (
                <Text
                  style={[
                    styles.chevron,
                    { color: colors.textSecondary },
                  ]}
                >
                  {index < expandedIndex ? '\u25BC' : '\u25B2'}
                </Text>
              )}
            </Pressable>

            {isExpanded && (
              <ScrollView
                style={styles.cardContent}
                contentContainerStyle={styles.cardContentInner}
                showsVerticalScrollIndicator
                nestedScrollEnabled
              >
                {card.content}
              </ScrollView>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 12,
    marginVertical: 4,
    overflow: 'hidden',
  },
  expandedCard: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: COLLAPSED_HEIGHT,
    paddingHorizontal: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  chevron: {
    fontSize: 12,
    marginLeft: 8,
  },
  cardContent: {
    flex: 1,
  },
  cardContentInner: {
    padding: 16,
    paddingTop: 8,
  },
});
