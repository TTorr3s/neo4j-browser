import styled from 'styled-components'

const chip = styled.div`
  word-break: break-all;
  cursor: pointer;
  font-family: ${props => props.theme.primaryFontFamily};
  font-weight: bold;
  font-size: 12px;
  background-color: #9195a0;
  color: #1b1e21;
  margin: 4px;
  padding: 3px 7px 3px 7px;
  span {
    line-height: normal;
  }
  display: inline-block;
`

export const StyledLabelChip = styled(chip)`
  border-radius: 20px;
  &:hover {
    background-color: #ffffff;
  }
`
export const StyledRelationshipChip = styled(chip)`
  border-radius: 3px;
  &:hover,
  &:focus,
  &:visited {
    background-color: #ffffff;
  }
`
export const StyledPropertyChip = styled(chip)`
  border-radius: 2px;
  background-color: transparent;
  border: 1px solid #595d66;
  color: #9195a0;
  span {
    color: #ccc;
  }
  &:hover {
    color: #ffffff;
    border-color: #ffffff;
  }
`
