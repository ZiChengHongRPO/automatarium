import { styled } from 'goober'

const Label = styled('label')`
  display: block;
  margin-bottom: .3em;
  /* &::after { */
    /* content: '${props => !props.$required ? ' (optional)' : ''}'; */
  /* } */
`

export default Label
