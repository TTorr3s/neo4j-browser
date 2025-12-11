import styled from 'styled-components'

// Tokyo Night inspired chip colors
const tokyoChip = {
  bg: '#414868', // Selection color - subtle background
  bgHover: '#565f89', // Comment color - hover state
  text: '#c0caf5', // Bright foreground
  border: '#565f89', // Muted border
  borderHover: '#7aa2f7' // Blue accent on hover
}

const chip = styled.div`
  word-break: break-all;
  cursor: pointer;
  font-family: ${props => props.theme.primaryFontFamily};
  font-weight: bold;
  font-size: 12px;
  background-color: ${tokyoChip.bg};
  color: ${tokyoChip.text};
  margin: 4px;
  padding: 3px 7px 3px 7px;
  span {
    line-height: normal;
  }
  display: inline-block;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;
`

export const StyledLabelChip = styled(chip)`
  border-radius: 20px;
  &:hover {
    background-color: ${tokyoChip.bgHover};
  }
`
export const StyledRelationshipChip = styled(chip)`
  border-radius: 3px;
  &:hover,
  &:focus,
  &:visited {
    background-color: ${tokyoChip.bgHover};
  }
`
export const StyledPropertyChip = styled(chip)`
  border-radius: 2px;
  background-color: transparent;
  border: 1px solid ${tokyoChip.border};
  color: ${tokyoChip.text};
  span {
    color: #a9b1d6;
  }
  &:hover {
    color: #c0caf5;
    border-color: ${tokyoChip.borderHover};
  }
`
